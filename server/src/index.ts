import "./sentry";
import "./lib/env";
import path from "path";
import * as Sentry from "@sentry/bun";
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
import { startGmailPollWorker } from "./lib/gmail/poll";
import usersRouter from "./routes/users";
import ticketsRouter from "./routes/tickets";
import webhooksRouter from "./routes/webhooks";
import dashboardRouter from "./routes/dashboard";

const app = express();

// Railway terminates TLS at its edge proxy and forwards plain HTTP — without this, Express sees
// every request as insecure, which breaks Better Auth's secure cookies and express-rate-limit's
// client IP detection (X-Forwarded-For).
app.set("trust proxy", 1);

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
app.use("/api/dashboard", dashboardRouter);

// Serve the built client (single Railway service hosts both the API and the frontend).
// Keeps client and server same-origin, so no cross-site cookie/CORS configuration is needed.
const clientDistPath = path.join(import.meta.dir, "../../client/dist");
app.use(express.static(clientDistPath));

app.get("/*splat", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Must be registered after all routes, before any other error-handling middleware
Sentry.setupExpressErrorHandler(app);

await startQueue();
await startTicketClassificationWorker();
await startAutoResolveWorker();
await startGmailPollWorker();

app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});
