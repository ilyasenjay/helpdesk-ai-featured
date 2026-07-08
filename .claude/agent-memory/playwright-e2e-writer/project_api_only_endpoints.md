---
name: project_api_only_endpoints
description: Pattern for testing pure API/webhook endpoints (no browser UI) with Playwright's request fixture, plus Mailgun webhook specifics
metadata:
  type: project
---

## Pattern for UI-less endpoints (webhooks, etc.)

For endpoints with no browser-facing UI (e.g. `POST /api/webhooks/email`), use only the
`request` fixture — no `page` at all. To assert side effects (DB rows created), there is
no raw-Prisma-in-test-file convention in this repo; instead, sign in as admin via
`request.post("/api/auth/sign-in/email", ...)` in the same test (cookies persist across
calls on the same `request` fixture instance within one test, confirmed pattern — see
[[project_e2e_infra]]) and then hit the existing authenticated read endpoints
(`GET /api/tickets`, `GET /api/tickets/:id`) to verify what was created. Filter the list
result by a unique field seeded in the request (e.g. a unique `customerEmail`) rather than
relying on array position, since tests run `fullyParallel` and data accumulates across the
whole run (no per-test cleanup — see below).

Playwright's `request.post(url, { multipart: {...} })` sends `multipart/form-data` and is
the right tool for endpoints behind `multer().none()` (form fields, no files).

## No per-test cleanup for created domain rows

There is no `DELETE /api/tickets/:id` route (only GET, GET/:id, PATCH). Tests that create
tickets/messages via the webhook do NOT delete them afterward — this matches the existing
convention already used by `create-user.spec.ts`/`user-management.spec.ts`, which never
delete users they create either. Isolation is achieved by using unique identifying values
per test (unique email/subject) and relying on `e2e/global-teardown.ts`'s end-of-run
TRUNCATE. Do not add per-test cleanup steps that don't already exist elsewhere in the suite.

## Zod v4 default (uncustomized) error messages — verified empirically

When a Zod schema field has no `{ error: "..." }` override (e.g. `mailgunSchema` in
`server/src/routes/webhooks.ts`, contrast with `inboundEmailSchema` in
`server/src/lib/tickets.ts` which does set custom messages), the actual default messages
observed via a quick `bun -e` repl script were:
- missing/undefined required string field → `"Invalid input: expected string, received undefined"`
- `z.email()` given a non-email string → `"Invalid email address"` (same text as the custom override elsewhere, so don't assume a field has a custom message just because the text looks intentional — verify by reading the schema)
- `z.string().min(1)` given `""` → `"Too small: expected string to have >=1 characters"`

When writing assertions against Zod 400 error messages for a schema without visible custom
`error` strings, do NOT guess the text — spin up a throwaway `bun -e` script importing the
actual schema (or an equivalent inline shape) and call `.safeParse()` to get the exact
`issues[0].message` before hardcoding it in a test assertion.

## Mailgun webhook signing key — check env before writing signature tests

`server/src/lib/env.ts` — `MAILGUN_WEBHOOK_SIGNING_KEY` is NOT in the `required` array, and
`server/.env.test` does not set it. This means `requireWebhookSecret`
(`server/src/lib/requireWebhookSecret.ts`) always calls `next()` immediately in the e2e
environment, without ever checking `timestamp`/`token`/`signature` values. The "200
{ ok: false } on bad signature" branch is genuinely unreachable through HTTP in this test
env. Pattern used: write that test anyway inside a `test.describe.skip(...)` block with a
comment explaining why, so it documents intended behavior and is easy to un-skip if
`MAILGUN_WEBHOOK_SIGNING_KEY` is ever added to `.env.test`. Don't just omit the scenario
silently — the skip + comment is more valuable than deleting it.

Because `requireWebhookSecret` runs BEFORE the handler's own Zod validation, and skips
entirely when the signing key is unset, "missing timestamp/token/signature" in this env
surfaces as a 400 (Zod `min(1)` failure in the handler), never as the middleware's 200
`{ ok: false }` — don't conflate the two failure paths when writing tests.

See [[project_e2e_infra]] for the general request-fixture/session pattern this builds on.
