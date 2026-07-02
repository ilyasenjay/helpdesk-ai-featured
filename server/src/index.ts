  import "./lib/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./lib/requireAuth";
import { requireAdmin } from "./lib/requireAdmin";
import { env } from "./lib/env";
import prisma from "./lib/db";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));

if (process.env.NODE_ENV === "production") {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", apiLimiter);
}

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json({ users });
});

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
