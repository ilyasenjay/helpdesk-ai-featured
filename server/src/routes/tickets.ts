import { Router } from "express";
import { z } from "zod";
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { requireAuth } from "../lib/requireAuth";
import prisma from "../lib/db";
import { MessageSender, type Prisma } from "../generated/prisma/client";
import {
  createMessageSchema,
  polishReplySchema,
  ticketsQuerySchema,
  updateTicketSchema,
} from "../lib/tickets";
import { AI_MODEL_ID, buildTicketSummaryPrompt, classifyAiError, formatPolishedReply } from "../lib/ai";
import { env } from "../lib/env";

const router = Router();

function firstError(result: z.ZodSafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Invalid input";
}

const ticketSelect = {
  id: true,
  subject: true,
  senderName: true,
  customerEmail: true,
  status: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TicketSelect;

router.get("/", requireAuth, async (req, res) => {
  const parsed = ticketsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }
  const { sortBy, sortOrder, status, category, search, page, pageSize } = parsed.data;

  const where: Prisma.TicketWhereInput = {
    ...(status && { status }),
    ...(category === "NONE" ? { category: null } : category ? { category } : {}),
    ...(search && { subject: { contains: search, mode: "insensitive" } }),
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: ticketSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);
  res.json({ tickets, total, page, pageSize });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id as string);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }
  res.json({ ticket });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id as string);
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }

  if (parsed.data.assignedToId != null) {
    const assignee = await prisma.user.findFirst({
      where: { id: parsed.data.assignedToId, deletedAt: null },
      select: { id: true },
    });
    if (!assignee) {
      res.status(400).json({ message: "Assignee not found" });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: parsed.data,
    select: ticketSelect,
  });
  res.json({ ticket });
});

router.post("/:id/polish", requireAuth, async (req, res) => {
  const parsed = polishReplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }

  if (!env.groqApiKey) {
    res.status(503).json({
      code: "ai_not_configured",
      message: "AI polish isn't configured on this server. Add GROQ_API_KEY to enable it.",
    });
    return;
  }

  const id = Number(req.params.id as string);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { subject: true, body: true, senderName: true },
  });
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  try {
    const { text } = await generateText({
      model: groq(AI_MODEL_ID),
      system:
        "You are a helpdesk assistant that polishes a support agent's draft reply before it is sent to a customer. " +
        "Improve grammar, clarity, and professional tone while preserving the original meaning and any specific " +
        "facts, numbers, or commitments. Reply with only the improved text — no preamble, quotes, or explanation. " +
        "Do not add a greeting/salutation (e.g. \"Hi [Name],\") or a sign-off/signature (e.g. \"Best regards, [Your Name]\") " +
        "— both are added automatically.",
      prompt: `Customer's ticket subject: ${ticket.subject}\n\nCustomer's original message: ${ticket.body}\n\nAgent's draft reply:\n${parsed.data.body}`,
    });
    res.json({
      body: formatPolishedReply({
        polishedText: text,
        customerName: ticket.senderName,
        agentName: req.user!.name,
        agentEmail: req.user!.email,
      }),
    });
  } catch (err) {
    const { status, code, message } = classifyAiError(err);
    res.status(status).json({ code, message });
  }
});

router.post("/:id/summarize", requireAuth, async (req, res) => {
  if (!env.groqApiKey) {
    res.status(503).json({
      code: "ai_not_configured",
      message: "AI summary isn't configured on this server. Add GROQ_API_KEY to enable it.",
    });
    return;
  }

  const id = Number(req.params.id as string);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: {
      subject: true,
      body: true,
      senderName: true,
      messages: { orderBy: { createdAt: "asc" }, select: { sender: true, body: true } },
    },
  });
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  try {
    const { text } = await generateText({
      model: groq(AI_MODEL_ID),
      system:
        "You are a helpdesk assistant that writes a concise internal summary of a support ticket for an agent's " +
        "quick reference. Summarize the customer's issue, the key points raised in the conversation, and the " +
        "current state or any commitments made so far. Write 2-4 sentences of plain prose. Do not address the " +
        "customer directly, and do not add a greeting, sign-off, or preamble — just the summary.",
      prompt: buildTicketSummaryPrompt({
        subject: ticket.subject,
        customerName: ticket.senderName,
        body: ticket.body,
        messages: ticket.messages,
      }),
    });

    const aiSummary = text.trim();
    await prisma.ticket.update({ where: { id }, data: { aiSummary } });
    res.json({ aiSummary });
  } catch (err) {
    const { status, code, message } = classifyAiError(err);
    res.status(status).json({ code, message });
  }
});

router.post("/:id/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.id as string);
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
  if (!ticket) {
    res.status(404).json({ message: "Ticket not found" });
    return;
  }

  const message = await prisma.message.create({
    data: {
      body: parsed.data.body,
      sender: MessageSender.AGENT,
      ticketId: id,
      userId: req.user!.id,
    },
  });
  res.status(201).json({ message });
});

export default router;
