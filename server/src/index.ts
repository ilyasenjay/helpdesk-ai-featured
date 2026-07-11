import "./lib/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { requireAuth } from "./lib/requireAuth";
import { env } from "./lib/env";
import { startQueue } from "./lib/queue";
import { startTicketClassificationWorker, startAutoResolveWorker } from "./lib/ai";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import webhooksRouter from "./routes/webhooks";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));

// Mount webhooks before the rate limiter — Mailgun delivery spikes must never be throttled
app.use("/api/webhooks", webhooksRouter);

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

app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);

await startQueue();
await startTicketClassificationWorker();
await startAutoResolveWorker();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
