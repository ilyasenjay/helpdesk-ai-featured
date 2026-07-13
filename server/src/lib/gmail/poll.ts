import { simpleParser } from "mailparser";
import type { Job } from "pg-boss";
import { boss } from "../queue";
import prisma from "../db";
import { MessageSender, TicketStatus } from "../../generated/prisma/client";
import { inboundEmailSchema } from "../tickets";
import { createTicketFromInboundEmail } from "../inbound-email";
import { getGmailClient, isGmailConfigured } from "./client";
import { stripQuotedReply, decodeCommonHtmlEntities } from "./quote";

const GMAIL_POLL_QUEUE = "gmail-poll";
const GMAIL_POLL_CRON = "* * * * *"; // every minute

// Only mail carrying this label is ever turned into a ticket — never the whole inbox. This is a
// personal Gmail account that also receives ordinary personal mail, so scanning "is:unread"
// across the whole inbox would (and once did) turn things like bank alerts into tickets.
// Set up a Gmail filter that applies this label to mail sent to your "+support" alias
// (e.g. to:(youraddress+support@gmail.com) -> apply label "Helpdesk") — see server/.env.example.
// A customer's reply lands back on that same address (it's what our reply's From: was), so it
// picks up the same label and is recognized as a continuation of its ticket's thread below.
const GMAIL_TICKET_LABEL = "Helpdesk";

// Real emails routinely exceed the Mailgun-derived length caps (signatures, quoted thread
// history) — truncate rather than drop the whole ticket, unlike the webhook path where Mailgun
// itself already caps the payload.
const MAX_SUBJECT_LENGTH = 255;
const MAX_BODY_LENGTH = 1000;

interface ParsedEmail {
  fromAddress: string;
  fromName: string;
  subject: string;
  body: string;
  messageIdHeader?: string;
}

async function fetchAndParseMessage(messageId: string): Promise<{ parsed: ParsedEmail; threadId?: string } | null> {
  const gmail = getGmailClient();
  const { data } = await gmail.users.messages.get({ userId: "me", id: messageId, format: "raw" });
  if (!data.raw) return null;

  const raw = Buffer.from(data.raw, "base64url");
  const parsed = await simpleParser(raw);

  const fromAddress = parsed.from?.value[0]?.address;
  if (!fromAddress) return null;

  const htmlBody = typeof parsed.html === "string" ? parsed.html : undefined;
  // Keep only the customer's new reply, not the quoted history of everything they're replying
  // to — and decode any literal "&gt;"/"&amp;" left behind by clients whose plain-text
  // alternative is a naive tag-strip of the HTML part rather than true plain text.
  const body = decodeCommonHtmlEntities(stripQuotedReply(parsed.text ?? htmlBody ?? "(no body)"));

  return {
    threadId: data.threadId ?? undefined,
    parsed: {
      fromAddress,
      fromName: parsed.from?.value[0]?.name || fromAddress,
      subject: (parsed.subject ?? "(no subject)").slice(0, MAX_SUBJECT_LENGTH),
      body: body.slice(0, MAX_BODY_LENGTH),
      messageIdHeader: parsed.messageId,
    },
  };
}

// A later message in a thread we already turned into a ticket — append it as a customer message
// instead of creating a duplicate ticket. Reopens the ticket if it had already been resolved or
// closed, since a new customer reply means it needs another look.
async function addReplyToExistingTicket(
  ticket: { id: number; status: TicketStatus },
  messageId: string,
  email: ParsedEmail,
): Promise<void> {
  const existing = await prisma.message.findUnique({
    where: { gmailMessageId: messageId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.message.create({
    data: { body: email.body, sender: MessageSender.CUSTOMER, ticketId: ticket.id, gmailMessageId: messageId },
  });

  const wasClosedOut = ticket.status === TicketStatus.resolved || ticket.status === TicketStatus.closed;

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      ...(email.messageIdHeader && { lastGmailMessageIdHeader: email.messageIdHeader }),
      ...(wasClosedOut && { status: TicketStatus.open }),
    },
  });
}

async function processMessage(messageId: string): Promise<void> {
  const fetched = await fetchAndParseMessage(messageId);

  if (fetched) {
    const { parsed: email, threadId } = fetched;

    const existingTicket = threadId
      ? await prisma.ticket.findUnique({ where: { gmailThreadId: threadId }, select: { id: true, status: true } })
      : null;

    if (existingTicket) {
      await addReplyToExistingTicket(existingTicket, messageId, email);
    } else {
      const validated = inboundEmailSchema.safeParse({
        from: email.fromAddress,
        fromName: email.fromName,
        subject: email.subject,
        body: email.body,
      });
      if (validated.success) {
        await createTicketFromInboundEmail({
          ...validated.data,
          gmailMessageId: messageId,
          gmailThreadId: threadId,
          gmailMessageIdHeader: email.messageIdHeader,
        });
      } else {
        console.error(`Skipping unprocessable Gmail message ${messageId}:`, validated.error.issues[0]?.message);
      }
    }
  } else {
    console.error(`Could not fetch/parse Gmail message ${messageId} — no raw body or from address`);
  }

  // Mark it read for inbox hygiene — purely cosmetic. Correctness never depends on this: dedup is
  // handled by createTicketFromInboundEmail (unique on ticket.gmailMessageId) and
  // addReplyToExistingTicket (unique on message.gmailMessageId) above, not by read/unread state.
  // Relying on "is:unread" alone previously meant any read event from any client (opening the
  // email to check it, another device syncing, etc.) — not just this call — would silently and
  // permanently drop the message from being picked up, with no ticket and no error logged.
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { removeLabelIds: ["UNREAD"] },
  });
}

export async function pollGmailInbox(): Promise<void> {
  if (!isGmailConfigured()) return;

  const gmail = getGmailClient();
  // Not "is:unread" — see processMessage's comment. Bounded to a recent window so this stays
  // cheap; DB-side dedup (not read state) is what makes re-scanning the same messages safe.
  const { data } = await gmail.users.messages.list({
    userId: "me",
    q: `label:${GMAIL_TICKET_LABEL} newer_than:2d`,
    maxResults: 25,
  });

  for (const { id } of data.messages ?? []) {
    if (!id) continue;
    try {
      await processMessage(id);
    } catch (err) {
      // One bad message shouldn't block the rest of the batch — it stays unread and gets
      // retried on the next poll.
      console.error(`Failed to process Gmail message ${id}:`, err);
    }
  }
}

// Called once at server startup. No-ops (with a log line) if Gmail isn't configured, mirroring
// the graceful-degradation pattern used for GROQ_API_KEY elsewhere.
export async function startGmailPollWorker(): Promise<void> {
  if (!isGmailConfigured()) {
    console.log(
      "Gmail polling disabled — set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN to enable it.",
    );
    return;
  }

  await boss.createQueue(GMAIL_POLL_QUEUE);
  await boss.schedule(GMAIL_POLL_QUEUE, GMAIL_POLL_CRON);

  await boss.work(GMAIL_POLL_QUEUE, async (jobs: Job[]) => {
    if (!jobs[0]) return;
    await pollGmailInbox();
  });
}
