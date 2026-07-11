import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import type { Job } from "pg-boss";
import { TicketCategory } from "../../generated/prisma/client";
import { env } from "../env";
import prisma from "../db";
import { boss } from "../queue";
import { AI_MODEL_ID } from "./model";

const CLASSIFY_TICKET_QUEUE = "classify-ticket";

interface ClassifyTicketJobData {
  ticketId: number;
}

const TICKET_CATEGORIES = [
  TicketCategory.GENERAL_QUESTION,
  TicketCategory.TECHNICAL_QUESTION,
  TicketCategory.REFUND_REQUEST,
] as const;

export function buildTicketCategoryPrompt(params: { subject: string; body: string }): string {
  return `Ticket subject: ${params.subject}\n\nTicket body: ${params.body}`;
}

export function parseTicketCategoryResponse(text: string): TicketCategory | null {
  const normalized = text.trim().toUpperCase();
  return (TICKET_CATEGORIES as readonly string[]).includes(normalized)
    ? (normalized as TicketCategory)
    : null;
}

// Classifies a ticket's category via Groq and saves it. Unlike the old fire-and-forget version,
// this is meant to run inside a pg-boss job handler: it only "skips" (resolves without doing
// anything) for conditions retrying can't fix — no API key configured, or the ticket no longer
// exists. Any other failure (rate limit, billing, network) is left to throw so pg-boss retries
// the job per the queue's retry policy instead of the classification being silently lost.
export async function classifyTicketCategory(ticketId: number): Promise<void> {
  if (!env.groqApiKey) return;

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { subject: true, body: true },
  });
  if (!ticket) return;

  const { text } = await generateText({
    model: groq(AI_MODEL_ID),
    system:
      "You classify helpdesk tickets into exactly one category based on their subject and body. " +
      "Reply with only one of these exact category codes and nothing else: " +
      "GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST. " +
      "Use TECHNICAL_QUESTION for bugs, errors, or questions about how something works. " +
      "Use REFUND_REQUEST for billing, charge, payment, or refund disputes. " +
      "Use GENERAL_QUESTION for anything else.",
    prompt: buildTicketCategoryPrompt(ticket),
  });

  const category = parseTicketCategoryResponse(text);
  if (category) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { category } });
  }
}

// Non-blocking: enqueues the classification job and returns immediately — callers (e.g. the
// inbound email webhook) must respond right away without waiting on the AI call. The job itself
// is durable (survives a server restart) and gets retried by pg-boss on failure.
export async function enqueueTicketClassification(ticketId: number): Promise<void> {
  try {
    await boss.send(CLASSIFY_TICKET_QUEUE, { ticketId } satisfies ClassifyTicketJobData);
  } catch (err) {
    console.error(`Failed to enqueue classification for ticket ${ticketId}:`, err);
  }
}

// Called once at server startup to create the queue and start the worker that processes jobs
// sent by enqueueTicketClassification.
export async function startTicketClassificationWorker(): Promise<void> {
  await boss.createQueue(CLASSIFY_TICKET_QUEUE, {
    retryLimit: 3,
    retryBackoff: true,
  });

  await boss.work<ClassifyTicketJobData>(CLASSIFY_TICKET_QUEUE, async (jobs: Job<ClassifyTicketJobData>[]) => {
    const job = jobs[0];
    if (!job) return;
    await classifyTicketCategory(job.data.ticketId);
  });
}
