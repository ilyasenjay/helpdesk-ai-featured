# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ticket-detail.spec.ts >> Ticket Detail — updating status >> changing the status updates the header badge and persists across reload
- Location: e2e/ticket-detail.spec.ts:226:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('ticket-status-badge')
Expected: "Open"
Received: "New"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByTestId('ticket-status-badge')
    10 × locator resolved to <span data-testid="ticket-status-badge">…</span>
       - unexpected value "New"

```

```yaml
- text: New
```

# Test source

```ts
  136 | 
  137 |     const link = page.getByRole("link", { name: ticket.subject, exact: true });
  138 |     await expect(link).toBeVisible();
  139 |     await link.click();
  140 | 
  141 |     await page.waitForURL(`/tickets/${ticket.id}`);
  142 |     await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
  143 |     await expect(page.getByText(`Ticket #${ticket.id}`)).toBeVisible();
  144 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
  145 |   });
  146 | });
  147 | 
  148 | // ---------------------------------------------------------------------------
  149 | // 2. Original message card
  150 | // ---------------------------------------------------------------------------
  151 | test.describe("Ticket Detail — original message", () => {
  152 |   test("renders the sender name, email, and message body", async ({ page, request }) => {
  153 |     await signInAsAdmin(request);
  154 |     const ticket = await createTestTicket(request, {
  155 |       senderName: "Jane Customer",
  156 |       body: "I can't reset my password.",
  157 |     });
  158 | 
  159 |     await loginAs(page, ADMIN.email, ADMIN.password);
  160 |     await page.goto(`/tickets/${ticket.id}`);
  161 | 
  162 |     await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
  163 |     await expect(page.getByText(ticket.senderName, { exact: true })).toBeVisible();
  164 |     await expect(page.getByText(ticket.customerEmail)).toBeVisible();
  165 |     // The webhook fixture's ticket.body equals its first (customer) message
  166 |     // body, so this text legitimately renders twice: once in the original
  167 |     // message card, once as the first bubble in the conversation thread.
  168 |     await expect(page.getByText(ticket.body).first()).toBeVisible();
  169 |   });
  170 | });
  171 | 
  172 | // ---------------------------------------------------------------------------
  173 | // 3. Replying
  174 | // ---------------------------------------------------------------------------
  175 | test.describe("Ticket Detail — replying", () => {
  176 |   // Every webhook-created fixture already has exactly one (customer) message
  177 |   // in its conversation thread, so "No replies yet." never applies here —
  178 |   // message-bubble count is used instead to prove a reply was (or wasn't)
  179 |   // added. See MessageBubble.tsx's data-testid="message-bubble".
  180 |   test("submitting a reply appends a message bubble without a full page reload and clears the textarea", async ({
  181 |     page,
  182 |     request,
  183 |   }) => {
  184 |     await signInAsAdmin(request);
  185 |     const ticket = await createTestTicket(request);
  186 | 
  187 |     await loginAs(page, ADMIN.email, ADMIN.password);
  188 |     await page.goto(`/tickets/${ticket.id}`);
  189 | 
  190 |     await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  191 | 
  192 |     const replyBody = `Thanks for reaching out — reply ${uniqueSuffix()}`;
  193 |     await page.getByLabel("Reply").fill(replyBody);
  194 |     await page.getByRole("button", { name: "Send Reply" }).click();
  195 | 
  196 |     await expect(page.getByTestId("message-bubble")).toHaveCount(2);
  197 |     await expect(page.getByTestId("message-bubble").last()).toContainText(replyBody);
  198 |     await expect(page.getByLabel("Reply")).toHaveValue("");
  199 |     // Still the same SPA route — a full reload would re-show the skeleton/header flicker.
  200 |     await expect(page).toHaveURL(`/tickets/${ticket.id}`);
  201 |     await expect(page.getByRole("heading", { name: ticket.subject })).toBeVisible();
  202 |   });
  203 | 
  204 |   test("submitting an empty reply shows a validation error and does not add a message", async ({
  205 |     page,
  206 |     request,
  207 |   }) => {
  208 |     await signInAsAdmin(request);
  209 |     const ticket = await createTestTicket(request);
  210 | 
  211 |     await loginAs(page, ADMIN.email, ADMIN.password);
  212 |     await page.goto(`/tickets/${ticket.id}`);
  213 | 
  214 |     await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  215 |     await page.getByRole("button", { name: "Send Reply" }).click();
  216 | 
  217 |     await expect(page.getByText("Reply cannot be empty")).toBeVisible();
  218 |     await expect(page.getByTestId("message-bubble")).toHaveCount(1);
  219 |   });
  220 | });
  221 | 
  222 | // ---------------------------------------------------------------------------
  223 | // 4. Updating status
  224 | // ---------------------------------------------------------------------------
  225 | test.describe("Ticket Detail — updating status", () => {
  226 |   test("changing the status updates the header badge and persists across reload", async ({
  227 |     page,
  228 |     request,
  229 |   }) => {
  230 |     await signInAsAdmin(request);
  231 |     const ticket = await createTestTicket(request);
  232 | 
  233 |     await loginAs(page, ADMIN.email, ADMIN.password);
  234 |     await page.goto(`/tickets/${ticket.id}`);
  235 | 
> 236 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Open");
      |                                                           ^ Error: expect(locator).toHaveText(expected) failed
  237 | 
  238 |     await waitForTicketPatch(page, ticket.id, () => selectOption(page, "status-select", "Resolved"));
  239 | 
  240 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Resolved");
  241 | 
  242 |     await page.reload();
  243 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Resolved");
  244 |   });
  245 | 
  246 |   test("status change is also reflected after navigating away and back via the tickets list", async ({
  247 |     page,
  248 |     request,
  249 |   }) => {
  250 |     await signInAsAdmin(request);
  251 |     const ticket = await createTestTicket(request);
  252 | 
  253 |     await loginAs(page, ADMIN.email, ADMIN.password);
  254 |     await page.goto(`/tickets/${ticket.id}`);
  255 | 
  256 |     await waitForTicketPatch(page, ticket.id, () => selectOption(page, "status-select", "Closed"));
  257 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Closed");
  258 | 
  259 |     await page.getByRole("link", { name: /back to tickets/i }).click();
  260 |     await page.waitForURL("/tickets");
  261 |     await page.getByPlaceholder("Search subject...").fill(ticket.subject);
  262 | 
  263 |     const link = page.getByRole("link", { name: ticket.subject, exact: true });
  264 |     await expect(link).toBeVisible();
  265 |     await link.click();
  266 | 
  267 |     await page.waitForURL(`/tickets/${ticket.id}`);
  268 |     await expect(page.getByTestId("ticket-status-badge")).toHaveText("Closed");
  269 |   });
  270 | });
  271 | 
  272 | // ---------------------------------------------------------------------------
  273 | // 5. Updating assignment
  274 | // ---------------------------------------------------------------------------
  275 | test.describe("Ticket Detail — updating assignment", () => {
  276 |   test("assigning the ticket to an agent updates the Assigned to select and persists across reload", async ({
  277 |     page,
  278 |     request,
  279 |   }) => {
  280 |     await signInAsAdmin(request);
  281 |     const ticket = await createTestTicket(request);
  282 | 
  283 |     await loginAs(page, ADMIN.email, ADMIN.password);
  284 |     await page.goto(`/tickets/${ticket.id}`);
  285 | 
  286 |     // toContainText (not toHaveText): the trigger's textContent also includes
  287 |     // the chevron icon's fallback glyph, so an exact match is too brittle.
  288 |     await expect(page.getByTestId("assigned-to-select")).toContainText("Unassigned");
  289 | 
  290 |     await waitForTicketPatch(page, ticket.id, () =>
  291 |       selectOption(page, "assigned-to-select", AGENT.name)
  292 |     );
  293 | 
  294 |     await expect(page.getByTestId("assigned-to-select")).toContainText(AGENT.name);
  295 | 
  296 |     await page.reload();
  297 |     await expect(page.getByTestId("assigned-to-select")).toContainText(AGENT.name);
  298 |   });
  299 | });
  300 | 
  301 | // ---------------------------------------------------------------------------
  302 | // 6. Updating category
  303 | // ---------------------------------------------------------------------------
  304 | test.describe("Ticket Detail — updating category", () => {
  305 |   test("changing the category updates the Category select and persists across reload", async ({
  306 |     page,
  307 |     request,
  308 |   }) => {
  309 |     await signInAsAdmin(request);
  310 |     const ticket = await createTestTicket(request);
  311 | 
  312 |     await loginAs(page, ADMIN.email, ADMIN.password);
  313 |     await page.goto(`/tickets/${ticket.id}`);
  314 | 
  315 |     await expect(page.getByTestId("category-select")).toContainText("Uncategorized");
  316 | 
  317 |     await waitForTicketPatch(page, ticket.id, () =>
  318 |       selectOption(page, "category-select", "Refund Request")
  319 |     );
  320 | 
  321 |     await expect(page.getByTestId("category-select")).toContainText("Refund Request");
  322 | 
  323 |     await page.reload();
  324 |     await expect(page.getByTestId("category-select")).toContainText("Refund Request");
  325 |   });
  326 | });
  327 | 
  328 | // ---------------------------------------------------------------------------
  329 | // 7. AI Summary card
  330 | // ---------------------------------------------------------------------------
  331 | // Tickets in this test environment can only be created via the inbound-email
  332 | // webhook (there is no direct POST /api/tickets route, and no AI-summary
  333 | // integration wired into any route), so aiSummary is always null for
  334 | // e2e-created tickets — there's no reliable way to target a ticket that has
  335 | // one. The "renders when aiSummary is set" case is covered by the Vitest
  336 | // component test in client/src/pages/TicketDetailPage.test.tsx. This test
```