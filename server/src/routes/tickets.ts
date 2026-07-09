import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/requireAuth";
import prisma from "../lib/db";
import type { Prisma } from "../generated/prisma/client";
import { ticketsQuerySchema, updateTicketSchema } from "../lib/tickets";

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

export default router;
