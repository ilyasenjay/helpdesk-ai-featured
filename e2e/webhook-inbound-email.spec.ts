import { test, expect, type APIRequestContext } from "@playwright/test";
import { ADMIN } from "./helpers/auth";

// ---------------------------------------------------------------------------
// About this suite
// ---------------------------------------------------------------------------
// POST /api/webhooks/email (server/src/routes/webhooks.ts) is an unauthenticated,
// multipart/form-data endpoint hit by Mailgun's inbound-email webhook. There is
// no browser UI involved, so every test here uses the `request` API context
// instead of `page`.
//
// Middleware chain: multer().none() -> requireWebhookSecret -> handler.
//
// server/.env.test does NOT set MAILGUN_WEBHOOK_SIGNING_KEY (see
// server/src/lib/env.ts — it's optional, not in the `required` list). That
// means requireWebhookSecret (server/src/lib/requireWebhookSecret.ts) always
// calls next() immediately in this e2e environment, without ever inspecting
// timestamp/token/signature. Its 200 { ok: false } "bad signature" branch is
// therefore unreachable here — see the skipped describe block at the bottom
// of this file, which documents (but does not run) that scenario.
//
// No cleanup step deletes tickets/messages after each test: there is no
// DELETE /api/tickets/:id route, and the project's existing e2e suite (see
// create-user.spec.ts) already relies on e2e/global-teardown.ts truncating
// all tables once at the end of the full run rather than per-test deletes.
// Each test uses a unique customer email to avoid collisions with other
// tests' data in the meantime.

const ENDPOINT = "/api/webhooks/email";

function uniqueSenderEmail(): string {
  return `e2e-webhook-${Date.now()}-${Math.floor(Math.random() * 9999)}@customer.local`;
}

function uniqueSubject(prefix = "E2E Webhook"): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

/** Minimal valid multipart payload; individual fields can be overridden per test. */
function basePayload(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    sender: uniqueSenderEmail(),
    From: "John Doe <john@example.com>",
    Subject: uniqueSubject(),
    "body-plain": "Hello, I need help.",
    timestamp: "1700000000",
    token: "test-token",
    signature: "test-signature",
    ...overrides,
  };
}

/** Returns a shallow copy of payload with `field` removed (TS-safe alternative to `delete`). */
function omit(payload: Record<string, string>, field: string): Record<string, string> {
  const { [field]: _removed, ...rest } = payload;
  return rest;
}

/** Sign in as admin via the request fixture so subsequent GETs to /api/tickets are authorised. */
async function signInAsAdmin(request: APIRequestContext): Promise<void> {
  const signIn = await request.post("/api/auth/sign-in/email", {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(signIn.ok()).toBeTruthy();
}

type TicketSummary = {
  id: number;
  subject: string;
  senderName: string;
  customerEmail: string | null;
};

/** Find the ticket created for a given customer email via the authenticated list endpoint. */
async function findTicketByCustomerEmail(
  request: APIRequestContext,
  customerEmail: string
): Promise<TicketSummary | undefined> {
  const res = await request.get("/api/tickets");
  expect(res.ok()).toBeTruthy();
  const { tickets } = await res.json();
  return tickets.find((t: TicketSummary) => t.customerEmail === customerEmail);
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
test.describe("POST /api/webhooks/email — happy path", () => {
  test.beforeEach(async ({ request }) => {
    await signInAsAdmin(request);
  });

  test("valid payload creates a ticket and a customer message, returns 200 { ok: true }", async ({
    request,
  }) => {
    const sender = uniqueSenderEmail();
    const subject = uniqueSubject();
    const payload = basePayload({
      sender,
      From: "John Doe <john@example.com>",
      Subject: subject,
      "body-plain": "Hello, I need help with my order.",
    });

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    expect(ticket!.subject).toBe(subject);
    expect(ticket!.senderName).toBe("John Doe");

    const detail = await request.get(`/api/tickets/${ticket!.id}`);
    expect(detail.ok()).toBeTruthy();
    const { ticket: full } = await detail.json();
    expect(full.messages).toHaveLength(1);
    expect(full.messages[0].body).toBe("Hello, I need help with my order.");
    expect(full.messages[0].sender).toBe("CUSTOMER");
  });

  test("sender name falls back to the raw From value when there are no angle brackets", async ({
    request,
  }) => {
    const sender = uniqueSenderEmail();
    const payload = basePayload({ sender, From: sender, Subject: uniqueSubject() });

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    expect(ticket!.senderName).toBe(sender);
  });

  test("stripped-text wins over body-plain when both are present", async ({ request }) => {
    const sender = uniqueSenderEmail();
    const payload = basePayload({
      sender,
      "body-plain": "plain text version",
      "stripped-text": "stripped text version",
    });

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    const detail = await request.get(`/api/tickets/${ticket!.id}`);
    const { ticket: full } = await detail.json();
    expect(full.messages[0].body).toBe("stripped text version");
  });

  test("body-plain is used when stripped-text is absent", async ({ request }) => {
    const sender = uniqueSenderEmail();
    const payload = basePayload({ sender, "body-plain": "plain text only" });

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    const detail = await request.get(`/api/tickets/${ticket!.id}`);
    const { ticket: full } = await detail.json();
    expect(full.messages[0].body).toBe("plain text only");
  });

  test("falls back to '(no body)' when both body-plain and stripped-text are blank", async ({
    request,
  }) => {
    const sender = uniqueSenderEmail();
    const payload = basePayload({ sender, "body-plain": "   " });

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    const detail = await request.get(`/api/tickets/${ticket!.id}`);
    const { ticket: full } = await detail.json();
    expect(full.messages[0].body).toBe("(no body)");
  });

  test("falls back to '(no subject)' when Subject is omitted", async ({ request }) => {
    const sender = uniqueSenderEmail();
    const payload = omit(basePayload({ sender }), "Subject");

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(200);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeDefined();
    expect(ticket!.subject).toBe("(no subject)");
  });
});

// ---------------------------------------------------------------------------
// Validation errors (mailgunSchema, checked before requireWebhookSecret can
// even matter — see the top-of-file note on MAILGUN_WEBHOOK_SIGNING_KEY)
// ---------------------------------------------------------------------------
test.describe("POST /api/webhooks/email — validation errors", () => {
  test("missing sender returns 400", async ({ request }) => {
    const payload = omit(basePayload(), "sender");
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid input: expected string, received undefined");
  });

  test("invalid sender email format returns 400", async ({ request }) => {
    const payload = basePayload({ sender: "not-an-email" });
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid email address");
  });

  test("missing From returns 400", async ({ request }) => {
    const payload = omit(basePayload(), "From");
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid input: expected string, received undefined");
  });

  test("missing timestamp returns 400", async ({ request }) => {
    const payload = omit(basePayload(), "timestamp");
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid input: expected string, received undefined");
  });

  test("missing token returns 400", async ({ request }) => {
    const payload = omit(basePayload(), "token");
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid input: expected string, received undefined");
  });

  test("missing signature returns 400", async ({ request }) => {
    const payload = omit(basePayload(), "signature");
    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid input: expected string, received undefined");
  });

  test("no ticket is created when validation fails", async ({ request }) => {
    await signInAsAdmin(request);
    const sender = uniqueSenderEmail();
    const payload = omit(basePayload({ sender }), "sender");

    const res = await request.post(ENDPOINT, { multipart: payload });
    expect(res.status()).toBe(400);

    const ticket = await findTicketByCustomerEmail(request, sender);
    expect(ticket).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Signature verification — documented but not runnable in this environment.
// ---------------------------------------------------------------------------
// server/.env.test has no MAILGUN_WEBHOOK_SIGNING_KEY set, so
// requireWebhookSecret always skips verification (calls next() unconditionally)
// and this branch can never actually execute against the running test server.
// Kept here, skipped, as living documentation: if MAILGUN_WEBHOOK_SIGNING_KEY
// is ever added to server/.env.test, un-skip this block. A *correct* signature
// would be computed as:
//   createHmac("sha256", MAILGUN_WEBHOOK_SIGNING_KEY).update(timestamp + token).digest("hex")
test.describe.skip(
  "POST /api/webhooks/email — signature verification (requires MAILGUN_WEBHOOK_SIGNING_KEY to be set)",
  () => {
    test("mismatched signature returns 200 { ok: false } and does not create a ticket", async ({
      request,
    }) => {
      await signInAsAdmin(request);
      const sender = uniqueSenderEmail();
      const payload = basePayload({ sender, signature: "definitely-wrong-signature" });

      const res = await request.post(ENDPOINT, { multipart: payload });
      expect(res.status()).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: false });

      const ticket = await findTicketByCustomerEmail(request, sender);
      expect(ticket).toBeUndefined();
    });
  }
);
