# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ticket-detail.spec.ts >> Ticket Detail — updating status >> status change is also reflected after navigating away and back via the tickets list
- Location: e2e/ticket-detail.spec.ts:246:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - link "Helpdesk" [ref=e5] [cursor=pointer]:
      - /url: /
    - generic [ref=e6]:
      - link "Tickets" [ref=e7] [cursor=pointer]:
        - /url: /tickets
      - link "Users" [ref=e8] [cursor=pointer]:
        - /url: /users
      - generic [ref=e9]: Test Admin
      - button "Sign out" [ref=e10]
  - main [ref=e11]:
    - generic [ref=e12]:
      - link "Back to tickets" [ref=e13] [cursor=pointer]:
        - /url: /tickets
        - img [ref=e14]
        - text: Back to tickets
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: "Ticket #1"
          - heading "E2E Ticket Detail 1783762608323-5772" [level=1] [ref=e19]
        - generic [ref=e22]: New
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]:
            - generic [ref=e27]:
              - generic [ref=e28]: JC
              - generic [ref=e29]:
                - generic [ref=e30]: Jane Customer
                - generic [ref=e31]:
                  - img [ref=e32]
                  - text: e2e-ticket-detail-1783762608323-7849@customer.local
              - generic [ref=e35]: Jul 11, 2026, 3:06 PM
            - paragraph [ref=e37]: I need help with my account.
          - button "Summarize" [ref=e39]:
            - img
            - text: Summarize
          - generic [ref=e40]:
            - generic [ref=e42]: Conversation
            - generic [ref=e43]:
              - generic [ref=e46]:
                - generic [ref=e47]:
                  - generic [ref=e48]: Customer
                  - generic [ref=e49]: ·
                  - generic [ref=e50]: Jul 11, 2026, 3:06 PM
                - paragraph [ref=e51]: I need help with my account.
              - generic [ref=e52]:
                - textbox "Reply" [ref=e53]:
                  - /placeholder: Write a reply…
                - generic [ref=e54]:
                  - button "Polish" [ref=e55]:
                    - img
                    - text: Polish
                  - button "Send Reply" [ref=e56]
        - generic [ref=e58]:
          - generic [ref=e60]: Details
          - generic [ref=e61]:
            - generic [ref=e62]:
              - generic [ref=e63]: Assigned to
              - combobox [ref=e64]:
                - generic [ref=e65]: Unassigned
                - img: ▼
              - textbox [ref=e66]: UNASSIGNED
            - generic [ref=e67]:
              - generic [ref=e68]: Status
              - paragraph [ref=e69]: AI is trying to resolve this ticket…
            - generic [ref=e70]:
              - generic [ref=e71]: Category
              - combobox [ref=e72]:
                - generic [ref=e73]: Uncategorized
                - img: ▼
              - textbox [ref=e74]: NONE
            - generic [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e77]: Created
                - generic [ref=e78]: Jul 11, 2026, 3:06 PM
              - generic [ref=e79]:
                - generic [ref=e80]: Updated
                - generic [ref=e81]: Jul 11, 2026, 3:06 PM
```

# Test source

```ts
  14  | // assignedTo: null, aiSummary: null } with exactly one CUSTOMER message.
  15  | //
  16  | // No cleanup step deletes tickets after each test — e2e/global-teardown.ts
  17  | // truncates all tables once at the end of the full run (see
  18  | // create-user.spec.ts / webhook-inbound-email.spec.ts for the same pattern).
  19  | // Every fixture uses a unique subject/sender email to avoid collisions with
  20  | // other tests' data running in parallel.
  21  | 
  22  | // ---------------------------------------------------------------------------
  23  | // Helpers
  24  | // ---------------------------------------------------------------------------
  25  | 
  26  | function uniqueSuffix(): string {
  27  |   return `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  28  | }
  29  | 
  30  | function uniqueSubject(prefix = "E2E Ticket Detail"): string {
  31  |   return `${prefix} ${uniqueSuffix()}`;
  32  | }
  33  | 
  34  | function uniqueSenderEmail(): string {
  35  |   return `e2e-ticket-detail-${uniqueSuffix()}@customer.local`;
  36  | }
  37  | 
  38  | /** Authenticate the `request` context as admin so subsequent API calls are authorised. */
  39  | async function signInAsAdmin(request: APIRequestContext): Promise<void> {
  40  |   const signIn = await request.post("/api/auth/sign-in/email", {
  41  |     data: { email: ADMIN.email, password: ADMIN.password },
  42  |   });
  43  |   expect(signIn.ok()).toBeTruthy();
  44  | }
  45  | 
  46  | interface TestTicket {
  47  |   id: number;
  48  |   subject: string;
  49  |   senderName: string;
  50  |   customerEmail: string;
  51  |   body: string;
  52  | }
  53  | 
  54  | /**
  55  |  * Create a ticket + its first customer message via the inbound-email webhook,
  56  |  * then look up its id via the authenticated list endpoint (the webhook
  57  |  * response itself only returns { ok: true }). Requires `request` to already
  58  |  * be signed in via signInAsAdmin.
  59  |  */
  60  | async function createTestTicket(
  61  |   request: APIRequestContext,
  62  |   overrides: Partial<{
  63  |     subject: string;
  64  |     senderName: string;
  65  |     senderEmail: string;
  66  |     body: string;
  67  |   }> = {}
  68  | ): Promise<TestTicket> {
  69  |   const senderEmail = overrides.senderEmail ?? uniqueSenderEmail();
  70  |   const subject = overrides.subject ?? uniqueSubject();
  71  |   const senderName = overrides.senderName ?? "Jane Customer";
  72  |   const body = overrides.body ?? "I need help with my account.";
  73  | 
  74  |   const res = await request.post("/api/webhooks/email", {
  75  |     multipart: {
  76  |       sender: senderEmail,
  77  |       From: `${senderName} <${senderEmail}>`,
  78  |       Subject: subject,
  79  |       "body-plain": body,
  80  |       timestamp: "1700000000",
  81  |       token: "test-token",
  82  |       signature: "test-signature",
  83  |     },
  84  |   });
  85  |   expect(res.status()).toBe(200);
  86  | 
  87  |   const listRes = await request.get("/api/tickets", { params: { search: subject } });
  88  |   expect(listRes.ok()).toBeTruthy();
  89  |   const { tickets } = await listRes.json();
  90  |   const ticket = tickets.find((t: { id: number; subject: string }) => t.subject === subject);
  91  |   if (!ticket) {
  92  |     throw new Error(`Ticket with subject "${subject}" was not found after creation`);
  93  |   }
  94  | 
  95  |   return { id: ticket.id, subject, senderName, customerEmail: senderEmail, body };
  96  | }
  97  | 
  98  | /**
  99  |  * Open a base-ui Select (client/src/components/ui/select.tsx) by its
  100 |  * trigger's data-testid and click the option with the given accessible
  101 |  * name. The trigger has role="combobox" and its accessible name is its
  102 |  * current displayed value (there is no aria-label/htmlFor linking the
  103 |  * visible <label> text to it), so triggers are targeted by data-testid
  104 |  * instead — added to TicketDetailsPanel.tsx for this purpose.
  105 |  */
  106 | async function selectOption(page: Page, triggerTestId: string, optionName: string): Promise<void> {
  107 |   await page.getByTestId(triggerTestId).click();
  108 |   await page.getByRole("option", { name: optionName, exact: true }).click();
  109 | }
  110 | 
  111 | /** Wait for the PATCH /api/tickets/:id request triggered by a details-panel change to resolve OK. */
  112 | async function waitForTicketPatch(page: Page, ticketId: number, action: () => Promise<void>) {
  113 |   const [response] = await Promise.all([
> 114 |     page.waitForResponse(
      |          ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  115 |       (res) => res.url().includes(`/api/tickets/${ticketId}`) && res.request().method() === "PATCH"
  116 |     ),
  117 |     action(),
  118 |   ]);
  119 |   expect(response.ok()).toBeTruthy();
  120 | }
  121 | 
  122 | // ---------------------------------------------------------------------------
  123 | // 1. Navigating from the tickets list
  124 | // ---------------------------------------------------------------------------
  125 | test.describe("Ticket Detail — navigating from the tickets list", () => {
  126 |   test("clicking a ticket subject opens its detail page with the correct subject, number, and status", async ({
  127 |     page,
  128 |     request,
  129 |   }) => {
  130 |     await signInAsAdmin(request);
  131 |     const ticket = await createTestTicket(request);
  132 | 
  133 |     await loginAs(page, ADMIN.email, ADMIN.password);
  134 |     await page.goto("/tickets");
  135 |     await page.getByPlaceholder("Search subject...").fill(ticket.subject);
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
```