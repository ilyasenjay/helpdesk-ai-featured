import { randomUUID } from "crypto";
import { env } from "../env";
import { getGmailClient, getGmailSupportAddress, isGmailConfigured } from "./client";

// Sending is gated on the same OAuth vars as polling, not a separate GMAIL_SMTP_APP_PASSWORD —
// see the module comment below for why raw SMTP was abandoned in favor of the Gmail API.
export const canSendGmailReply = isGmailConfigured;

interface SendReplyEmailInput {
  to: string;
  subject: string;
  body: string;
  // RFC822 Message-ID of the message this is a reply to, if any — keeps it threaded in the
  // customer's mail client instead of arriving as a disconnected new email.
  inReplyTo?: string | null;
  // Gmail's own conversation id — passing it to messages.send threads the reply into the same
  // Gmail conversation natively, on top of the In-Reply-To/References headers below (which cover
  // threading in the *customer's* mail client).
  gmailThreadId?: string | null;
}

function withReSubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

// Encodes a header value as an RFC 2047 "encoded word" if it contains non-ASCII characters —
// needed since raw MIME headers are ASCII-only; ticket subjects/bodies can contain arbitrary
// unicode (e.g. accented names, emoji in a subject line).
function encodeHeaderValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf-8").toString("base64")}?=`;
}

// Sends a ticket reply as an email via the Gmail API (users.messages.send) — not SMTP. Railway
// (and many PaaS hosts) blocks outbound SMTP ports (25/465/587) entirely as an anti-abuse measure;
// connections there don't just fail, they hang until timeout, which is worse than a clear error.
// The Gmail API works because it's a normal HTTPS call, and reuses the same OAuth credentials
// already configured for inbound polling — no separate app password needed.
//
// From is the plain account address, matching the account's own mailbox — Gmail's Send-As rules
// treat this the same way the old SMTP relay did (silently substituting the authenticated
// account's real address unless it's a verified alias), so there's nothing to gain by fighting it
// here either. Reply-To is unrestricted, so we use it to point the customer's next reply at the
// +support alias instead — that's what keeps their reply matching the Gmail filter/label and
// therefore reaching the poller.
export async function sendTicketReplyEmail(input: SendReplyEmailInput): Promise<string | null> {
  const gmail = getGmailClient();
  const messageId = `<${randomUUID()}@mail.gmail.com>`;

  const headers = [
    `From: "Support" <${env.gmailAddress}>`,
    `To: ${input.to}`,
    `Reply-To: ${getGmailSupportAddress()}`,
    `Subject: ${encodeHeaderValue(withReSubject(input.subject))}`,
    `Message-ID: ${messageId}`,
    ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`] : []),
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
  ];

  const raw = Buffer.from(
    `${headers.join("\r\n")}\r\n\r\n${Buffer.from(input.body, "utf-8").toString("base64")}`,
  ).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: input.gmailThreadId ?? undefined },
  });

  return messageId;
}
