import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../lib/db";
import { requireWebhookSecret } from "../lib/requireWebhookSecret";
import { inboundEmailSchema } from "../lib/tickets";
import { enqueueTicketClassification, enqueueAutoResolveTicket } from "../lib/ai";
import { AI_AGENT_EMAIL } from "../lib/ai/agent";
import { MessageSender } from "../generated/prisma/client";

const router = Router();

let aiAgentIdPromise: Promise<string | null> | null = null;

// Cached lookup — the AI agent's id never changes at runtime, so avoid a query on every inbound
// email. Resolves to null (ticket left unassigned) if the seed script hasn't been run yet.
function getAiAgentId(): Promise<string | null> {
  aiAgentIdPromise ??= prisma.user
    .findUnique({ where: { email: AI_AGENT_EMAIL }, select: { id: true } })
    .then((user) => user?.id ?? null);
  return aiAgentIdPromise;
}

const mailgunSchema = z.object({
  sender: z.email(),
  From: z.string().min(1),
  Subject: z.string().optional().default(""),
  "body-plain": z.string().optional().default(""),
  "stripped-text": z.string().optional(),
  timestamp: z.string().min(1),
  token: z.string().min(1),
  signature: z.string().min(1),
});

// Extract display name from "John Doe <john@example.com>"; fall back to the raw From value
function parseSenderName(from: string): string {
  const match = /^(.+?)\s*<[^>]+>$/.exec(from.trim());
  return match?.[1]?.trim() || from.trim();
}

router.post("/email", multer().none(), requireWebhookSecret, async (req, res) => {
  const rawParsed = mailgunSchema.safeParse(req.body);
  if (!rawParsed.success) {
    res.status(400).json({ message: rawParsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { sender, From, Subject, "body-plain": bodyPlain, "stripped-text": strippedText } =
    rawParsed.data;

  const parsed = inboundEmailSchema.safeParse({
    from: sender,
    fromName: parseSenderName(From),
    subject: Subject.trim() || "(no subject)",
    body: strippedText?.trim() || bodyPlain.trim() || "(no body)",
  });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { from, fromName, subject, body } = parsed.data;
  const aiAgentId = await getAiAgentId();

  const ticket = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: { subject, body, customerEmail: from, senderName: fromName, assignedToId: aiAgentId },
    });
    await tx.message.create({
      data: { body, sender: MessageSender.CUSTOMER, ticketId: ticket.id },
    });
    return ticket;
  });

  // Non-blocking: enqueues the classification and auto-resolve jobs via pg-boss and returns
  // immediately, so the webhook responds without waiting on either AI call.
  void enqueueTicketClassification(ticket.id);
  void enqueueAutoResolveTicket(ticket.id);

  res.status(200).json({ ok: true });
});

export default router;
