---
name: project_ticket_fixtures
description: How to create Ticket/Message fixtures for e2e tests — there is no POST /api/tickets; only the inbound-email webhook creates tickets
metadata:
  type: project
---

`server/src/routes/tickets.ts` has no `POST /` — tickets can only be created via the Mailgun inbound-email webhook, `POST /api/webhooks/email` (unauthenticated, `multipart/form-data`, see `server/src/routes/webhooks.ts` and `e2e/webhook-inbound-email.spec.ts`). There is no other HTTP-reachable way to create one.

So all ticket e2e fixtures go through the webhook, then look up the created ticket's numeric id via the authenticated list endpoint (`GET /api/tickets?search=<unique subject>`), since the webhook response is just `{ ok: true }`. Pattern used in `e2e/ticket-detail.spec.ts`'s `createTestTicket()` helper — reuse/extend it for future ticket-related specs rather than re-deriving:

```ts
async function createTestTicket(request: APIRequestContext, overrides = {}): Promise<TestTicket> {
  // POST /api/webhooks/email with a unique sender/subject, then
  // GET /api/tickets?search=<subject> (request must already be signed in as admin)
  // to find the created ticket's id.
}
```

Consequences to remember when writing assertions against webhook-created tickets:
- `ticket.body` and `ticket.messages[0].body` are **always equal** (the webhook route creates the Ticket and the first CUSTOMER Message with the same body text). On `TicketDetailPage`, this means the body text legitimately renders **twice** — once in `TicketMessageCard` (original message), once as the first bubble in `ConversationCard`. `getByText(body)` needs `.first()` or a scoped locator, or you'll get a strict-mode violation.
- Every webhook-created ticket already has **1 message** in the conversation thread, so `ConversationCard`'s "No replies yet." empty state is never reachable via this fixture path. Test reply-adds/reply-validation by asserting message counts instead — see `MessageBubble.tsx`'s `data-testid="message-bubble"` (added to support this) in [[project_ui_selectors]].
- Fresh webhook tickets always start `{ status: "open", category: null, assignedTo: null, aiSummary: null }`.
- `aiSummary` can **never** be set through any HTTP-reachable path in this test env (no AI-summarization route is wired up yet) — so "AI summary card renders when present" is untestable at the e2e level. That case is covered by the Vitest test in `client/src/pages/TicketDetailPage.test.tsx` instead; e2e only checks the card is *absent* for a real (webhook-created) ticket.
- `GET /api/users/agents` (despite the name) returns **all** non-deleted users, admin and agent alike — so `AGENT.name` ("Test Agent") and `ADMIN.name` ("Test Admin") both appear as options in the "Assigned to" select.

See [[project_ui_selectors]] for how to drive the Select dropdowns these fixtures feed into, and [[project_e2e_infra]] for the dev-server port conflict and react-query retry-timeout gotchas hit while testing this page.
