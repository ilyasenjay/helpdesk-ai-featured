import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/requireAuth";
import prisma from "../lib/db";
import { TicketStatus, TicketCategory } from "../generated/prisma/client";

const router = Router();

function firstError(result: z.ZodSafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Invalid input";
}

const updateTicketSchema = z.object({
  status: z.enum([TicketStatus.open, TicketStatus.resolved, TicketStatus.closed]).optional(),
  category: z
    .enum([
      TicketCategory.GENERAL_QUESTION,
      TicketCategory.TECHNICAL_QUESTION,
      TicketCategory.REFUND_REQUEST,
    ])
    .nullable()
    .optional(),
});

router.get("/", requireAuth, async (_req, res) => {
  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      subject: true,
      senderName: true,
      customerEmail: true,
      status: true,
      category: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id as string);
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
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

  const ticket = await prisma.ticket.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      subject: true,
      senderName: true,
      customerEmail: true,
      status: true,
      category: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ ticket });
});

export default router;
