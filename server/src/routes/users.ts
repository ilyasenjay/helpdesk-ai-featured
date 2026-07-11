import { Router } from "express";
import { z } from "zod";
import { auth } from "../lib/auth";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import prisma from "../lib/db";
import { Role } from "../generated/prisma/client";
import { AI_AGENT_EMAIL } from "../lib/ai/agent";

const router = Router();

function firstError(result: z.ZodSafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Invalid input";
}

const createUserSchema = z.object({
  name: z.string().trim().min(3),
  email: z.email(),
  password: z.string().trim().min(8),
});

const editUserSchema = z.object({
  name: z.string().trim().min(3),
  email: z.email(),
  password: z.string().trim().min(8).optional(),
});

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.get("/agents", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }

  const { name, email, password } = parsed.data;
  const result = await auth.api.createUser({
    body: { name, email, password, role: Role.agent as any },
  });
  res.status(201).json(result);
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const parsed = editUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: firstError(parsed) });
    return;
  }

  const { name, email, password } = parsed.data;

  const id = req.params.id as string;

  const user = await prisma.user.update({
    where: { id },
    data: { name, email },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  if (password) {
    await auth.api.setUserPassword({
      body: { userId: id, newPassword: password },
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]): [string, string | undefined] => [
          k,
          Array.isArray(v) ? v[0] : v,
        ])
      ),
    });
  }

  res.json({ user });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }
  if (user.role === Role.admin) {
    res.status(403).json({ message: "Admin users cannot be deleted" });
    return;
  }
  if (user.email === AI_AGENT_EMAIL) {
    res.status(403).json({ message: "The AI agent cannot be deleted" });
    return;
  }

  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.ticket.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } }),
    prisma.user.update({ where: { id }, data: { deletedAt: new Date() } }),
  ]);
  res.status(204).end();
});

export default router;
