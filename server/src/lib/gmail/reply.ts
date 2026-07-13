import prisma from "../db";
import { sendTicketReplyEmail, canSendGmailReply } from "./send";

interface TicketForReply {
  id: number;
  subject: string;
  customerEmail: string | null;
  gmailThreadId: string | null;
  lastGmailMessageIdHeader: string | null;
}

// Emails `body` to the customer if this ticket has a known Gmail thread to reply into. No-ops
// for tickets with no Gmail origin (e.g. created purely via the UI) or when Gmail isn't
// configured — the reply still exists in the ticket's message thread regardless, it just isn't
// also sent as an actual email. Failures are logged, not thrown: a failed send shouldn't undo the
// message that was already saved.
export async function sendTicketReplyIfPossible(ticket: TicketForReply, body: string): Promise<void> {
  if (!canSendGmailReply() || !ticket.customerEmail || !ticket.gmailThreadId) return;

  try {
    const messageId = await sendTicketReplyEmail({
      to: ticket.customerEmail,
      subject: ticket.subject,
      body,
      inReplyTo: ticket.lastGmailMessageIdHeader,
      gmailThreadId: ticket.gmailThreadId,
    });

    if (messageId) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { lastGmailMessageIdHeader: messageId },
      });
    }
  } catch (err) {
    console.error(`Failed to send reply email for ticket ${ticket.id}:`, err);
  }
}
