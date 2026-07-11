import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { TicketCategory } from "../../generated/prisma/client";
import { env } from "../env";
import prisma from "../db";
import { AI_MODEL_ID } from "./model";

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

// Fire-and-forget: classifies a ticket's category via Groq and saves it, but never throws —
// callers (e.g. the inbound email webhook) must respond immediately without waiting on this,
// so any failure here is only logged, never surfaced to a request.
export async function classifyTicketCategory(ticketId: number): Promise<void> {
  if (!env.groqApiKey) return;

  try {
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
  } catch (err) {
    console.error(`Failed to auto-classify ticket ${ticketId}:`, err);
  }
}
