import prisma from "./db";
import { MessageSender } from "../generated/prisma/client";
import { enqueueTicketClassification, enqueueAutoResolveTicket } from "./ai";
import { AI_AGENT_EMAIL } from "./ai/agent";

let aiAgentIdPromise: Promise<string | null> | null = null;

// Cached lookup — the AI agent's id never changes at runtime, so avoid a query on every inbound
// email. Resolves to null (ticket left unassigned) if the seed script hasn't been run yet.
function getAiAgentId(): Promise<string | null> {
  aiAgentIdPromise ??= prisma.user
    .findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true } })
    .then((user) => user?.id ?? null);
  return aiAgentIdPromise;
}

export interface InboundEmailInput {
  from: string;
  fromName: string;
  subject: string;
  body: string;
  // Set only for tickets sourced from the Gmail poller — guards against creating a duplicate
  // ticket if the same message gets processed twice (e.g. marking it read fails after the ticket
  // was already created, so the next poll picks it up again).
  gmailMessageId?: string;
  // Gmail's conversation id — lets the poller recognize a later reply in this thread instead of
  // creating a duplicate ticket for it.
  gmailThreadId?: string;
  // RFC822 Message-ID header of this message — seeds the ticket's In-Reply-To/References chain
  // for when we send a reply back.
  gmailMessageIdHeader?: string;
}

// Creates a ticket + initial customer message from an inbound email, assigns it to the AI agent,
// and enqueues classification/auto-resolve. Shared by the Mailgun webhook and the Gmail poller —
// callers are responsible for validating/normalizing `input` (e.g. via inboundEmailSchema) first.
// Returns null if a ticket for this Gmail message already exists.
export async function createTicketFromInboundEmail(
  input: InboundEmailInput,
): Promise<{ id: number } | null> {
  if (input.gmailMessageId) {
    const existing = await prisma.ticket.findUnique({
      where: { gmailMessageId: input.gmailMessageId },
      select: { id: true },
    });
    if (existing) return null;
  }

  const aiAgentId = await getAiAgentId();

  const ticket = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        subject: input.subject,
        body: input.body,
        customerEmail: input.from,
        senderName: input.fromName,
        assignedToId: aiAgentId,
        gmailMessageId: input.gmailMessageId,
        gmailThreadId: input.gmailThreadId,
        lastGmailMessageIdHeader: input.gmailMessageIdHeader,
      },
    });
    await tx.message.create({
      data: { body: input.body, sender: MessageSender.CUSTOMER, ticketId: ticket.id },
    });
    return ticket;
  });

  // Non-blocking: enqueues the classification and auto-resolve jobs via pg-boss and returns
  // immediately.
  void enqueueTicketClassification(ticket.id);
  void enqueueAutoResolveTicket(ticket.id);

  return ticket;
}
