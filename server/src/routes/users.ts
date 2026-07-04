import { Router } from "express";
import { z } from "zod";
import { auth } from "../lib/auth";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import prisma from "../lib/db";
import { Role } from "../generated/prisma/client";

const router = Router();

const createUserSchema = z.object({
  name: z.string().trim().min(3),
  email: z.email(),
  password: z.string().trim().min(8),
});

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { name, email, password } = parsed.data;
  const result = await auth.api.createUser({
    body: { name, email, password, role: Role.agent as any },
  });
  res.status(201).json(result);
});

export default router;
