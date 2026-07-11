import { test, expect, type Page } from "@playwright/test";
import { loginAs, ADMIN } from "./helpers/auth";
import { seedTicket, closeDbPool } from "./helpers/db";

// ---------------------------------------------------------------------------
// About this suite
// ---------------------------------------------------------------------------
// Covers the AI auto-resolution UI states introduced across
// client/src/components/TicketsTable.tsx, TicketDetailsPanel.tsx, and
// TicketDetailPage.tsx:
//   1. "new"/"processing" status badges rendering + list filtering
//   2. AI-fully-resolved tickets (resolvedByAi: true) excluded from the list
//   3. the "AI is trying to resolve this ticket…" placeholder replacing the
//      status Select on the detail page while status is "new"/"processing"
//   4. the "Resolved by AI" badge on the detail page header
//   5. a regression check that a normal "open" ticket's status Select still works
//
// There is no HTTP-reachable, deterministic way to put a ticket into "new",
// "processing", or resolvedByAi: true in this test env — the inbound-email
// webhook always lands a ticket at "open" and the real pg-boss auto-resolve
// job races the test (see the comment block in e2e/helpers/db.ts). So every
// fixture here is seeded directly via seedTicket() instead of the webhook
// used by ticket-detail.spec.ts / webhook-inbound-email.spec.ts.
//
// No cleanup step deletes tickets after each test — e2e/global-teardown.ts
// truncates all tables once at the end of the full run. Every fixture uses a
// unique subject to avoid collisions with other tests' data running in
// parallel (fullyParallel: true in playwright.config.ts).

test.afterAll(async () => {
  await closeDbPool();
});

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

/**
 * Open a base-ui Select (client/src/components/ui/select.tsx) by its
 * trigger's data-testid and click the option with the given accessible
 * name. Mirrors the helper in ticket-detail.spec.ts.
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

/** The <tr> containing the row for a given ticket subject in the tickets table. */
function ticketRow(page: Page, subject: string) {
  return page.locator("tr").filter({ has: page.getByRole("link", { name: subject, exact: true }) });
}

// ---------------------------------------------------------------------------
// 1. Status badges + filtering for "new" / "processing"
// ---------------------------------------------------------------------------
test.describe("Tickets list — new/processing status badges and filtering", () => {
  test("renders 'New', 'Processing', and 'Open' status badges with the correct label", async ({
    page,
  }) => {
    const prefix = `E2E AI Badges ${uniqueSuffix()}`;
    const [newTicket, processingTicket, openTicket] = await Promise.all([
      seedTicket({ subject: `${prefix} new`, status: "new" }),
      seedTicket({ subject: `${prefix} processing`, status: "processing" }),
      seedTicket({ subject: `${prefix} open`, status: "open" }),
    ]);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets");
    await page.getByPlaceholder("Search subject...").fill(prefix);

    await expect(ticketRow(page, newTicket.subject)).toContainText("New");
    await expect(ticketRow(page, processingTicket.subject)).toContainText("Processing");
    await expect(ticketRow(page, openTicket.subject)).toContainText("Open");
  });

  test("filtering by status 'New' shows only the new ticket", async ({ page }) => {
    const prefix = `E2E AI Filter New ${uniqueSuffix()}`;
    const [newTicket, processingTicket, openTicket] = await Promise.all([
      seedTicket({ subject: `${prefix} new`, status: "new" }),
      seedTicket({ subject: `${prefix} processing`, status: "processing" }),
      seedTicket({ subject: `${prefix} open`, status: "open" }),
    ]);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets");
    await page.getByPlaceholder("Search subject...").fill(prefix);
    await selectOption(page, "status-filter-select", "New");

    await expect(page.getByRole("link", { name: newTicket.subject, exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: processingTicket.subject, exact: true })
    ).not.toBeVisible();
    await expect(page.getByRole("link", { name: openTicket.subject, exact: true })).not.toBeVisible();
  });

  test("filtering by status 'Processing' shows only the processing ticket", async ({ page }) => {
    const prefix = `E2E AI Filter Processing ${uniqueSuffix()}`;
    const [newTicket, processingTicket, openTicket] = await Promise.all([
      seedTicket({ subject: `${prefix} new`, status: "new" }),
      seedTicket({ subject: `${prefix} processing`, status: "processing" }),
      seedTicket({ subject: `${prefix} open`, status: "open" }),
    ]);

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets");
    await page.getByPlaceholder("Search subject...").fill(prefix);
    await selectOption(page, "status-filter-select", "Processing");

    await expect(
      page.getByRole("link", { name: processingTicket.subject, exact: true })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: newTicket.subject, exact: true })).not.toBeVisible();
    await expect(page.getByRole("link", { name: openTicket.subject, exact: true })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. AI-resolved tickets excluded from the list
// ---------------------------------------------------------------------------
test.describe("Tickets list — AI-resolved tickets excluded", () => {
  test("a ticket resolved entirely by AI does not appear in the list but is reachable by direct link", async ({
    page,
  }) => {
    const ticket = await seedTicket({
      subject: `E2E AI Resolved Excluded ${uniqueSuffix()}`,
      status: "resolved",
      resolvedByAi: true,
    });

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto("/tickets");
    await page.getByPlaceholder("Search subject...").fill(ticket.subject);

    await expect(page.getByText("No tickets found.")).toBeVisible();
    await expect(page.getByRole("link", { name: ticket.subject, exact: true })).not.toBeVisible();

    // Excluded from the list only, not deleted — still reachable by direct
    // link (see the where-clause comment in server/src/routes/tickets.ts).
    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. AI-processing placeholder replaces the status Select on the detail page
// ---------------------------------------------------------------------------
test.describe("Ticket detail — AI-processing placeholder replaces the status Select", () => {
  for (const status of ["new", "processing"] as const) {
    test(`shows "AI is trying to resolve this ticket…" instead of the status Select when status is "${status}"`, async ({
      page,
    }) => {
      const ticket = await seedTicket({
        subject: `E2E AI Processing ${status} ${uniqueSuffix()}`,
        status,
      });

      await loginAs(page, ADMIN.email, ADMIN.password);
      await page.goto(`/tickets/${ticket.id}`);

      await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
      await expect(page.getByText("AI is trying to resolve this ticket…")).toBeVisible();
      await expect(page.getByTestId("status-select")).not.toBeAttached();
    });
  }
});

// ---------------------------------------------------------------------------
// 4. "Resolved by AI" badge
// ---------------------------------------------------------------------------
test.describe("Ticket detail — 'Resolved by AI' badge", () => {
  test("shows the badge when resolvedByAi is true", async ({ page }) => {
    const ticket = await seedTicket({
      subject: `E2E Resolved By AI True ${uniqueSuffix()}`,
      status: "resolved",
      resolvedByAi: true,
    });

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("ticket-resolved-by-ai-badge")).toBeVisible();
    await expect(page.getByTestId("ticket-resolved-by-ai-badge")).toContainText("Resolved by AI");
  });

  test("does not show the badge when resolvedByAi is false", async ({ page }) => {
    const ticket = await seedTicket({
      subject: `E2E Resolved By AI False ${uniqueSuffix()}`,
      status: "open",
      resolvedByAi: false,
    });

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
    await expect(page.getByTestId("ticket-resolved-by-ai-badge")).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 5. Regression — a normal "open" ticket's status Select still works
// ---------------------------------------------------------------------------
test.describe("Ticket detail — status Select regression check", () => {
  test("a normal 'open' ticket's status Select still renders and updates the status", async ({
    page,
  }) => {
    const ticket = await seedTicket({
      subject: `E2E Open Status Regression ${uniqueSuffix()}`,
      status: "open",
    });

    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
    await expect(page.getByTestId("status-select")).toBeVisible();
    await expect(page.getByText("AI is trying to resolve this ticket…")).not.toBeAttached();

    await waitForTicketPatch(page, ticket.id, () => selectOption(page, "status-select", "Resolved"));

    await expect(page.getByTestId("ticket-status-badge")).toHaveText("Resolved");
  });
});
