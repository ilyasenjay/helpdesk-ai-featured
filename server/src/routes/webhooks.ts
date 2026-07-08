import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import prisma from "../lib/db";
import { requireWebhookSecret } from "../lib/requireWebhookSecret";
import { inboundEmailSchema } from "../lib/tickets";
import { MessageSender } from "../generated/prisma/client";

const router = Router();

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

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: { subject, body, customerEmail: from, senderName: fromName },
    });
    await tx.message.create({
      data: { body, sender: MessageSender.CUSTOMER, ticketId: ticket.id },
    });
  });

  res.status(200).json({ ok: true });
});

export default router;
