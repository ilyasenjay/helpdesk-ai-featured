import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import type { Job } from "pg-boss";
import { join } from "node:path";
import { TicketStatus, MessageSender } from "../../generated/prisma/client";
import { env } from "../env";
import prisma from "../db";
import { boss } from "../queue";
import { AI_MODEL_ID } from "./model";
import { sendTicketReplyIfPossible } from "../gmail/reply";

const AUTO_RESOLVE_QUEUE = "auto-resolve-ticket";
const ESCALATE_SENTINEL = "ESCALATE";
// Matches the sentinel as a whole word anywhere in the response, not just an exact match — models
// don't always follow "reply with exactly X and nothing else" and sometimes wrap the sentinel in
// an explanation (e.g. "This isn't covered by the knowledge base.\nESCALATE"). Treating any mention
// of it as an escalation errs safe: worst case a resolvable ticket goes to a human anyway, instead
// of the alternative — the literal sentinel leaking into a reply sent to the customer.
const ESCALATE_PATTERN = new RegExp(`\\b${ESCALATE_SENTINEL}\\b`, "i");
const KNOWLEDGE_BASE_PATH = join(import.meta.dir, "../../../knowledge-base.md");

interface AutoResolveTicketJobData {
  ticketId: number;
}

let knowledgeBasePromise: Promise<string> | null = null;

function loadKnowledgeBase(): Promise<string> {
  knowledgeBasePromise ??= Bun.file(KNOWLEDGE_BASE_PATH).text();
  return knowledgeBasePromise;
}

export function buildAutoResolvePrompt(params: { subject: string; body: string }): string {
  return `Ticket subject: ${params.subject}\n\nTicket body: ${params.body}`;
}

// Returns the customer-facing reply, or null if the ticket should be escalated to a human agent.
export function parseAutoResolveResponse(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || ESCALATE_PATTERN.test(trimmed)) return null;
  return trimmed;
}

function formatAutoResolveReply(params: { replyText: string; customerName: string }): string {
  return `Hi ${params.customerName},\n\n${params.replyText}\n\nBest regards,\nSupport Team`;
}

// Attempts to auto-resolve a newly-arrived ticket against the knowledge base. Meant to run inside
// a pg-boss job handler, mirroring classifyTicketCategory: it only "skips" (resolves without doing
// anything) for conditions retrying can't fix — no API key configured, the ticket no longer exists,
// or a human/a previous run has already moved it past the new/processing states. Any other failure
// is left to throw so pg-boss retries the job instead of the ticket getting stuck in "processing".
export async function attemptAutoResolveTicket(ticketId: number): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      status: true,
      subject: true,
      body: true,
      senderName: true,
      customerEmail: true,
      gmailThreadId: true,
      lastGmailMessageIdHeader: true,
    },
  });
  if (!ticket) return;
  if (ticket.status !== TicketStatus.new && ticket.status !== TicketStatus.processing) return;

  if (!env.groqApiKey) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.open, assignedToId: null },
    });
    return;
  }

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: TicketStatus.processing } });

  const knowledgeBase = await loadKnowledgeBase();

  const { text } = await generateText({
    model: groq(AI_MODEL_ID),
    system:
      "You are an automated helpdesk assistant that resolves support tickets the moment they arrive, " +
      "using ONLY the official knowledge base below. If the knowledge base fully and confidently answers " +
      "the customer's question, reply with the exact message to send them: a helpful, professional answer " +
      "grounded in the knowledge base. Do not add a preamble like \"Sure, here's the answer\", and do not " +
      "add a greeting or sign-off — those are added automatically. If you cannot confidently resolve the " +
      "ticket from the knowledge base alone, or if any of the escalation rules in the knowledge base apply, " +
      `your entire response must be the single word ${ESCALATE_SENTINEL} — no explanation, no reasoning, ` +
      `no other text of any kind, and never that word combined with anything else.\n\n` +
      `Knowledge base:\n${knowledgeBase}`,
    prompt: buildAutoResolvePrompt(ticket),
  });

  const replyText = parseAutoResolveResponse(text);

  if (!replyText) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.open, assignedToId: null },
    });
    return;
  }

  const replyBody = formatAutoResolveReply({ replyText, customerName: ticket.senderName });

  await prisma.$transaction([
    prisma.message.create({
      data: {
        body: replyBody,
        sender: MessageSender.AI,
        ticketId,
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.resolved, resolvedByAi: true },
    }),
  ]);

  await sendTicketReplyIfPossible({ id: ticketId, ...ticket }, replyBody);
}

// Non-blocking: enqueues the auto-resolve job and returns immediately — callers (e.g. the inbound
// email webhook) must respond right away without waiting on the AI call. The job itself is durable
// (survives a server restart) and gets retried by pg-boss on failure.
export async function enqueueAutoResolveTicket(ticketId: number): Promise<void> {
  try {
    await boss.send(AUTO_RESOLVE_QUEUE, { ticketId } satisfies AutoResolveTicketJobData);
  } catch (err) {
    console.error(`Failed to enqueue auto-resolve for ticket ${ticketId}:`, err);
  }
}

// Called once at server startup to create the queue and start the worker that processes jobs sent
// by enqueueAutoResolveTicket.
export async function startAutoResolveWorker(): Promise<void> {
  await boss.createQueue(AUTO_RESOLVE_QUEUE, {
    retryLimit: 3,
    retryBackoff: true,
  });

  await boss.work<AutoResolveTicketJobData>(AUTO_RESOLVE_QUEUE, async (jobs: Job<AutoResolveTicketJobData>[]) => {
    const job = jobs[0];
    if (!job) return;
    await attemptAutoResolveTicket(job.data.ticketId);
  });
}
