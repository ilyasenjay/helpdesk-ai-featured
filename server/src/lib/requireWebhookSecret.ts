import type { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

function verifyMailgunSignature(key: string, timestamp: string, token: string, signature: string): boolean {
  const computed = createHmac("sha256", key).update(timestamp + token).digest("hex");
  if (computed.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// Verifies the Mailgun webhook HMAC-SHA256 signature.
// Must run after multer (or any multipart parser) so req.body fields are populated.
// Skipped entirely when MAILGUN_WEBHOOK_SIGNING_KEY is not set (e.g. local dev).
// Returns 200 with { ok: false } on failure — Mailgun retries on non-2xx, so we
// silently discard invalid requests rather than triggering a retry storm.
export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  if (!env.mailgunWebhookSigningKey) {
    next();
    return;
  }

  const { timestamp, token, signature } = req.body as Record<string, string>;

  if (!timestamp || !token || !signature) {
    res.status(200).json({ ok: false });
    return;
  }

  if (!verifyMailgunSignature(env.mailgunWebhookSigningKey, timestamp, token, signature)) {
    res.status(200).json({ ok: false });
    return;
  }

  next();
}
