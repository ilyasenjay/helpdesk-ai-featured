import nodemailer from "nodemailer";
import { env } from "../env";
import { getGmailSupportAddress } from "./client";

export function isSmtpConfigured(): boolean {
  return Boolean(env.gmailAddress && env.gmailSmtpAppPassword);
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!isSmtpConfigured()) {
    throw new Error("Gmail SMTP is not configured — set GMAIL_ADDRESS/GMAIL_SMTP_APP_PASSWORD");
  }

  transporter ??= nodemailer.createTransport({
    service: "gmail",
    // Google displays app passwords with spaces for readability, but SMTP AUTH needs them
    // stripped — strip defensively here rather than relying on .env being formatted just right.
    auth: { user: env.gmailAddress, pass: env.gmailSmtpAppPassword?.replace(/\s+/g, "") },
  });

  return transporter;
}

interface SendReplyEmailInput {
  to: string;
  subject: string;
  body: string;
  // RFC822 Message-ID of the message this is a reply to, if any — keeps it threaded in the
  // customer's mail client instead of arriving as a disconnected new email.
  inReplyTo?: string | null;
}

function withReSubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

// Sends a ticket reply as an email via Gmail's SMTP relay (authenticated with an app password —
// simpler than OAuth for send-only access, and Gmail automatically saves a threaded copy to Sent
// on this account). Returns the sent message's own Message-ID header, so the caller can chain it
// into the next reply's In-Reply-To/References.
//
// From is the plain account address — Gmail's SMTP relay silently rewrites From to the
// authenticated account's real address unless it's a verified "Send As" alias, so fighting that
// isn't worth it. Reply-To is unrestricted (it's just a hint, not used for delivery/auth), so we
// use it to point the customer's next reply at the +support alias instead — that's what keeps
// their reply matching the Gmail filter/label and therefore reaching the poller.
export async function sendTicketReplyEmail(input: SendReplyEmailInput): Promise<string | null> {
  const info = await getTransporter().sendMail({
    from: `"Support" <${env.gmailAddress}>`,
    replyTo: getGmailSupportAddress(),
    to: input.to,
    subject: withReSubject(input.subject),
    text: input.body,
    ...(input.inReplyTo && {
      inReplyTo: input.inReplyTo,
      references: input.inReplyTo,
    }),
  });

  return info.messageId ?? null;
}
