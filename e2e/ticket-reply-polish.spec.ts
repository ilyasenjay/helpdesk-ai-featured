import { test, expect, type APIRequestContext, type Page, type Route } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers/auth";

// ---------------------------------------------------------------------------
// About this suite
// ---------------------------------------------------------------------------
// Covers the "Polish" button in client/src/components/ReplyForm.tsx (sits to
// the left of "Send Reply" on the ticket detail page). See
// server/src/routes/tickets.ts POST /:id/polish.
//
// This test env has no ANTHROPIC_API_KEY configured (server/.env.test), so
// the real endpoint deterministically returns 503
// { code: "ai_not_configured", message: "..." } — that's exercised end to
// end against the real backend (no mocking). The success path (polished text
// replacing the textarea) has no way to get a real AI response in this env,
// so it's covered via page.route interception of
// POST /api/tickets/:id/polish.
//
// Ticket fixtures are created the same way as ticket-detail.spec.ts: via the
// inbound-email webhook (POST /api/webhooks/email), then looked up via the
// authenticated list endpoint. No cleanup step deletes tickets after each
// test — e2e/global-teardown.ts truncates all tables once at the end of the
// full run. Every fixture uses a unique subject/sender email to avoid
// collisions with other tests' data running in parallel.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function uniqueSubject(prefix = "E2E Reply Polish"): string {
  return `${prefix} ${uniqueSuffix()}`;
}

function uniqueSenderEmail(): string {
  return `e2e-reply-polish-${uniqueSuffix()}@customer.local`;
}

/** Authenticate the `request` context as admin so subsequent API calls are authorised. */
async function signInAsAdmin(request: APIRequestContext): Promise<void> {
  const signIn = await request.post("/api/auth/sign-in/email", {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(signIn.ok()).toBeTruthy();
}

interface TestTicket {
  id: number;
  subject: string;
}

/**
 * Create a ticket + its first customer message via the inbound-email webhook,
 * then look up its id via the authenticated list endpoint (the webhook
 * response itself only returns { ok: true }). Requires `request` to already
 * be signed in via signInAsAdmin.
 */
async function createTestTicket(request: APIRequestContext): Promise<TestTicket> {
  const senderEmail = uniqueSenderEmail();
  const subject = uniqueSubject();

  const res = await request.post("/api/webhooks/email", {
    multipart: {
      sender: senderEmail,
      From: `Jane Customer <${senderEmail}>`,
      Subject: subject,
      "body-plain": "I need help with my account.",
      timestamp: "1700000000",
      token: "test-token",
      signature: "test-signature",
    },
  });
  expect(res.status()).toBe(200);

  const listRes = await request.get("/api/tickets", { params: { search: subject } });
  expect(listRes.ok()).toBeTruthy();
  const { tickets } = await listRes.json();
  const ticket = tickets.find((t: { id: number; subject: string }) => t.subject === subject);
  if (!ticket) {
    throw new Error(`Ticket with subject "${subject}" was not found after creation`);
  }

  return { id: ticket.id, subject };
}

async function fulfillPolishSuccess(route: Route, polishedBody: string): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ body: polishedBody }),
  });
}

async function openTicket(page: Page, ticketId: number): Promise<void> {
  await loginAs(page, ADMIN.email, ADMIN.password);
  await page.goto(`/tickets/${ticketId}`);
  await expect(page.getByLabel("Reply")).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1. Empty textarea
// ---------------------------------------------------------------------------
test.describe("Reply — Polish button — empty textarea", () => {
  test("clicking Polish with an empty textarea shows the same validation error as Send Reply, without a network call", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    let polishRequestSeen = false;
    await page.route(`**/api/tickets/${ticket.id}/polish`, async (route) => {
      polishRequestSeen = true;
      await route.continue();
    });

    await page.getByRole("button", { name: "Polish" }).click();

    await expect(page.getByText("Reply cannot be empty")).toBeVisible();
    await expect(page.getByLabel("Reply")).toHaveValue("");
    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
    expect(polishRequestSeen).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Real backend failure (no ANTHROPIC_API_KEY configured in this test env)
// ---------------------------------------------------------------------------
test.describe("Reply — Polish button — real backend, AI not configured", () => {
  test("clicking Polish with text POSTs to /polish and surfaces the 503 ai_not_configured message in the root-error slot", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    const draftBody = `Draft reply that needs polishing ${uniqueSuffix()}`;
    await page.getByLabel("Reply").fill(draftBody);

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/tickets/${ticket.id}/polish`) && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Polish" }).click(),
    ]);

    expect(response.status()).toBe(503);
    const json = await response.json();
    expect(json).toEqual({
      code: "ai_not_configured",
      message: "AI polish isn't configured on this server. Add ANTHROPIC_API_KEY to enable it.",
    });

    await expect(page.getByTestId("form-root-error")).toHaveText(
      "AI polish isn't configured on this server. Add ANTHROPIC_API_KEY to enable it."
    );
    // The agent's draft is preserved — polish failure must not clear or alter it.
    await expect(page.getByLabel("Reply")).toHaveValue(draftBody);
    // No message was sent as a side effect of the failed polish attempt.
    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  });

  test("the polish request body is { body: <textarea text> }", async ({ page, request }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    const draftBody = `Please check request payload ${uniqueSuffix()}`;
    await page.getByLabel("Reply").fill(draftBody);

    const [request_] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes(`/api/tickets/${ticket.id}/polish`) && req.method() === "POST"
      ),
      page.getByRole("button", { name: "Polish" }).click(),
    ]);

    expect(request_.postDataJSON()).toEqual({ body: draftBody });
  });
});

// ---------------------------------------------------------------------------
// 3. Mocked success path
// ---------------------------------------------------------------------------
test.describe("Reply — Polish button — mocked success", () => {
  test("on a successful polish response, the textarea content is replaced with the polished text", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    const draftBody = "hey there i cant reset my pw can u help";
    const polishedBody = "Hello, I'm unable to reset my password. Could you please help me with this?";

    await page.route(`**/api/tickets/${ticket.id}/polish`, async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ body: draftBody });
      await fulfillPolishSuccess(route, polishedBody);
    });

    await page.getByLabel("Reply").fill(draftBody);

    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/tickets/${ticket.id}/polish`) && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Polish" }).click(),
    ]);

    await expect(page.getByLabel("Reply")).toHaveValue(polishedBody);
    // No root-error should be showing on a successful polish.
    await expect(page.getByTestId("form-root-error")).not.toBeVisible();
    // Polishing does not itself send a message.
    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  });

  test("the polished text can then be sent as the reply", async ({ page, request }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    const draftBody = "thanks for reaching out will fix asap";
    const polishedBody = `Thank you for reaching out — we will resolve this as soon as possible. ${uniqueSuffix()}`;

    await page.route(`**/api/tickets/${ticket.id}/polish`, async (route) => {
      await fulfillPolishSuccess(route, polishedBody);
    });

    await page.getByLabel("Reply").fill(draftBody);
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/tickets/${ticket.id}/polish`) && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Polish" }).click(),
    ]);
    await expect(page.getByLabel("Reply")).toHaveValue(polishedBody);

    await page.getByRole("button", { name: "Send Reply" }).click();

    await expect(page.getByTestId("message-bubble")).toHaveCount(2);
    await expect(page.getByTestId("message-bubble").last()).toContainText(polishedBody);
    await expect(page.getByLabel("Reply")).toHaveValue("");
  });
});

// ---------------------------------------------------------------------------
// 4. Mocked failure surfaces arbitrary server error messages generically
// ---------------------------------------------------------------------------
test.describe("Reply — Polish button — mocked failure", () => {
  test("a non-503 JSON error response also surfaces its message in the root-error slot and preserves the draft", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);
    await openTicket(page, ticket.id);

    const draftBody = `Draft that will fail to polish ${uniqueSuffix()}`;

    await page.route(`**/api/tickets/${ticket.id}/polish`, async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          code: "ai_upstream_error",
          message: "The AI provider returned an error. Please try again.",
        }),
      });
    });

    await page.getByLabel("Reply").fill(draftBody);
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes(`/api/tickets/${ticket.id}/polish`) && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "Polish" }).click(),
    ]);

    await expect(page.getByTestId("form-root-error")).toHaveText(
      "The AI provider returned an error. Please try again."
    );
    await expect(page.getByLabel("Reply")).toHaveValue(draftBody);
    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  });
});
