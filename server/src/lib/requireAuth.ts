import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import prisma from "./db";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletedAt: true },
  });
  if (dbUser?.deletedAt) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.user = session.user;
  req.session = session.session;
  next();
}
