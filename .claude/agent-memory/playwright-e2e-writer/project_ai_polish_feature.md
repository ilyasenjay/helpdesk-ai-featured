---
name: project_ai_polish_feature
description: How the ReplyForm "Polish" button (AI-assisted reply rewrite) is tested — real 503 in test env vs page.route mocking for success
metadata:
  type: project
---

`client/src/components/ReplyForm.tsx` has a "Polish" button next to "Send Reply" that POSTs `{ body }` to `POST /api/tickets/:id/polish` (`server/src/routes/tickets.ts`) and replaces the textarea with the returned `{ body: string }` on success. Covered in `e2e/ticket-reply-polish.spec.ts`.

Key facts for testing this and any future AI-backed route:

- `server/.env.test` has **no `ANTHROPIC_API_KEY`** set, and `server/src/lib/env.ts` reads it as `env.anthropicApiKey`. The polish route checks this *before* touching Prisma/Anthropic and, if absent, deterministically returns `503 { code: "ai_not_configured", message: "AI polish isn't configured on this server. Add ANTHROPIC_API_KEY to enable it." }`. This is a legitimate **real-backend** (non-mocked) test case — it exercises the actual button wiring, request shape, and error-surfacing path end to end, and is not flaky since it never reaches the network/Anthropic API.
- The success path (polished text actually replacing the textarea) has no way to get a real AI response in this env — mock it with `page.route('**/api/tickets/:id/polish', ...)` and `route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ body: polishedText }) })`.
- Validation quirk: clicking Polish with an empty textarea does **not** hit the network at all — `handlePolish` in `ReplyForm.tsx` runs `schema.safeParse` client-side first and calls `setError("body", ...)` directly, showing the same "Reply cannot be empty" text as the Send Reply path's zodResolver error, in the same `<p className="field-error">` slot (not `form-root-error`). Assert no request fires (e.g. `page.route` a spy that flips a boolean, assert false) rather than just asserting the error text, since the schema-parity is the actual behavior being verified.
- Both success and error mutations use the same `data-testid="form-root-error"` slot (`FormRootError.tsx`) as Send Reply's error — `getErrorMessage(err)` in `client/src/lib/errors.ts` pulls `err.response.data.message`, so any JSON error body with a `message` field renders verbatim there, not just the specific `ai_not_configured` one.
- On both success and failure, the agent's in-progress draft text should be preserved/replaced correctly — failure must leave the typed draft untouched (no clearing), success replaces it outright. Worth asserting both explicitly since a naive `reset()` call reused from the send-reply mutation would incorrectly wipe the draft on error.

See [[project_ticket_fixtures]] for the ticket-creation-via-webhook pattern reused here, and [[project_e2e_infra]] for the general run/setup details.
