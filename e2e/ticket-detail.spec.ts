import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginAs, ADMIN, AGENT } from "./helpers/auth";

// ---------------------------------------------------------------------------
// About this suite
// ---------------------------------------------------------------------------
// Covers client/src/pages/TicketDetailPage.tsx (route: /tickets/:id) and its
// sub-components under client/src/components/ticket-detail/.
//
// There is no direct POST /api/tickets route, so ticket fixtures are created
// the same way production data arrives: via the inbound-email webhook
// (POST /api/webhooks/email, see webhook-inbound-email.spec.ts). Each ticket
// created this way starts as { status: "open", category: null,
// assignedTo: null, aiSummary: null } with exactly one CUSTOMER message.
//
// No cleanup step deletes tickets after each test — e2e/global-teardown.ts
// truncates all tables once at the end of the full run (see
// create-user.spec.ts / webhook-inbound-email.spec.ts for the same pattern).
// Every fixture uses a unique subject/sender email to avoid collisions with
// other tests' data running in parallel.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function uniqueSubject(prefix = "E2E Ticket Detail"): string {
  return `${prefix} ${uniqueSuffix()}`;
}

function uniqueSenderEmail(): string {
  return `e2e-ticket-detail-${uniqueSuffix()}@customer.local`;
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
  senderName: string;
  customerEmail: string;
  body: string;
}

/**
 * Create a ticket + its first customer message via the inbound-email webhook,
 * then look up its id via the authenticated list endpoint (the webhook
 * response itself only returns { ok: true }). Requires `request` to already
 * be signed in via signInAsAdmin.
 */
async function createTestTicket(
  request: APIRequestContext,
  overrides: Partial<{
    subject: string;
    senderName: string;
    senderEmail: string;
    body: string;
  }> = {}
): Promise<TestTicket> {
  const senderEmail = overrides.senderEmail ?? uniqueSenderEmail();
  const subject = overrides.subject ?? uniqueSubject();
  const senderName = overrides.senderName ?? "Jane Customer";
  const body = overrides.body ?? "I need help with my account.";

  const res = await request.post("/api/webhooks/email", {
    multipart: {
      sender: senderEmail,
      From: `${senderName} <${senderEmail}>`,
      Subject: subject,
      "body-plain": body,
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

  return { id: ticket.id, subject, senderName, customerEmail: senderEmail, body };
}

/**
 * Open a base-ui Select (client/src/components/ui/select.tsx) by its
 * trigger's data-testid and click the option with the given accessible
 * name. The trigger has role="combobox" and its accessible name is its
 * current displayed value (there is no aria-label/htmlFor linking the
 * visible <label> text to it), so triggers are targeted by data-testid
 * instead — added to TicketDetailsPanel.tsx for this purpose.
 */
async function selectOption(page: Page, triggerTestId: string, optionName: string): Promise<void> {
  await page.getByTestId(triggerTestId).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

/** Wait for the PATCH /api/tickets/:id request triggered by a details-panel change to resolve OK. */
async function waitForTicketPatch(page: Page, ticketId: number, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/tickets/${ticketId}`) && res.request().method() === "PATCH"
    ),
    action(),
  ]);
  expect(response.ok()).toBeTruthy();
}

// ---------------------------------------------------------------------------
// 1. Navigating from the tickets list
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — navigating from the tickets list", () => {
  test("clicking a ticket subject opens its detail page with the correct subject, number, and status", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets");
    await page.getByPlaceholder("Search subject...").fill(ticket.subject);

    const link = page.getByRole("link", { name: ticket.subject, exact: true });
    await expect(link).toBeVisible();
    await link.click();

    await page.waitForURL(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByText(`Ticket #${ticket.id}`)).toBeVisible();
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
  });
});

// ---------------------------------------------------------------------------
// 2. Original message card
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — original message", () => {
  test("renders the sender name, email, and message body", async ({ page, request }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request, {
      senderName: "Jane Customer",
      body: "I can't reset my password.",
    });

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByText(ticket.senderName, { exact: true })).toBeVisible();
    await expect(page.getByText(ticket.customerEmail)).toBeVisible();
    // The webhook fixture's ticket.body equals its first (customer) message
    // body, so this text legitimately renders twice: once in the original
    // message card, once as the first bubble in the conversation thread.
    await expect(page.getByText(ticket.body).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Replying
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — replying", () => {
  // Every webhook-created fixture already has exactly one (customer) message
  // in its conversation thread, so "No replies yet." never applies here —
  // message-bubble count is used instead to prove a reply was (or wasn't)
  // added. See MessageBubble.tsx's data-testid="message-bubble".
  test("submitting a reply appends a message bubble without a full page reload and clears the textarea", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("message-bubble")).toHaveCount(1);

    const replyBody = `Thanks for reaching out — reply ${uniqueSuffix()}`;
    await page.getByLabel("Reply").fill(replyBody);
    await page.getByRole("button", { name: "Send Reply" }).click();

    await expect(page.getByTestId("message-bubble")).toHaveCount(2);
    await expect(page.getByTestId("message-bubble").last()).toContainText(replyBody);
    await expect(page.getByLabel("Reply")).toHaveValue("");
    // Still the same SPA route — a full reload would re-show the skeleton/header flicker.
    await expect(page).toHaveURL(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
  });

  test("submitting an empty reply shows a validation error and does not add a message", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
    await page.getByRole("button", { name: "Send Reply" }).click();

    await expect(page.getByText("Reply cannot be empty")).toBeVisible();
    await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Updating status
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — updating status", () => {
  test("changing the status updates the header badge and persists across reload", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");

    await waitForTicketPatch(page, ticket.id, () => selectOption(page, "status-select", "Resolved"));

    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Resolved");

    await page.reload();
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Resolved");
  });

  test("status change is also reflected after navigating away and back via the tickets list", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await waitForTicketPatch(page, ticket.id, () => selectOption(page, "status-select", "Closed"));
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Closed");

    await page.getByRole("link", { name: /back to tickets/i }).click();
    await page.waitForURL("/tickets");
    await page.getByPlaceholder("Search subject...").fill(ticket.subject);

    const link = page.getByRole("link", { name: ticket.subject, exact: true });
    await expect(link).toBeVisible();
    await link.click();

    await page.waitForURL(`/tickets/${ticket.id}`);
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Closed");
  });
});

// ---------------------------------------------------------------------------
// 5. Updating assignment
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — updating assignment", () => {
  test("assigning the ticket to an agent updates the Assigned to select and persists across reload", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    // toContainText (not toHaveText): the trigger's textContent also includes
    // the chevron icon's fallback glyph, so an exact match is too brittle.
    await expect(page.getByTestId("assigned-to-select")).toContainText("Unassigned");

    await waitForTicketPatch(page, ticket.id, () =>
      selectOption(page, "assigned-to-select", AGENT.name)
    );

    await expect(page.getByTestId("assigned-to-select")).toContainText(AGENT.name);

    await page.reload();
    await expect(page.getByTestId("assigned-to-select")).toContainText(AGENT.name);
  });
});

// ---------------------------------------------------------------------------
// 6. Updating category
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — updating category", () => {
  test("changing the category updates the Category select and persists across reload", async ({
    page,
    request,
  }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("category-select")).toContainText("Uncategorized");

    await waitForTicketPatch(page, ticket.id, () =>
      selectOption(page, "category-select", "Refund Request")
    );

    await expect(page.getByTestId("category-select")).toContainText("Refund Request");

    await page.reload();
    await expect(page.getByTestId("category-select")).toContainText("Refund Request");
  });
});

// ---------------------------------------------------------------------------
// 7. AI Summary card
// ---------------------------------------------------------------------------
// Tickets in this test environment can only be created via the inbound-email
// webhook (there is no direct POST /api/tickets route, and no AI-summary
// integration wired into any route), so aiSummary is always null for
// e2e-created tickets — there's no reliable way to target a ticket that has
// one. The "renders when aiSummary is set" case is covered by the Vitest
// component test in client/src/pages/TicketDetailPage.test.tsx. This test
// only verifies the card stays hidden for a real ticket without a summary.
test.describe("Ticket Detail — AI summary card", () => {
  test("does not render for a ticket with no aiSummary", async ({ page, request }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByText("AI Summary")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Not found
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — not found", () => {
  test("visiting a nonexistent ticket id shows 'Ticket not found.'", async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets/999999999");
    // The app's QueryClient (client/src/main.tsx) uses TanStack Query's
    // default retry (3 attempts, exponential backoff), so even a 404
    // response can take several seconds to settle — give this a longer
    // timeout than the default 5s instead of disabling retries.
    await expect(page.getByText("Ticket not found.")).toBeVisible({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// 9. Back navigation
// ---------------------------------------------------------------------------
test.describe("Ticket Detail — back navigation", () => {
  test("the Back to tickets link returns to /tickets", async ({ page, request }) => {
    await signInAsAdmin(request);
    const ticket = await createTestTicket(request);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await page.getByRole("link", { name: /back to tickets/i }).click();
    await page.waitForURL("/tickets");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
  });
});
