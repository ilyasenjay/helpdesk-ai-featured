---
name: project_e2e_infra
description: E2E test infrastructure — playwright config, global setup/teardown, test DB, run command
metadata:
  type: project
---

## Config file

`playwright.config.ts` at project root — do NOT recreate. Key settings:
- `testDir: './e2e'`
- `globalSetup: './e2e/global-setup.ts'`
- `globalTeardown: './e2e/global-teardown.ts'`
- `fullyParallel: true`
- `baseURL: 'http://localhost:5173'`
- webServers: server uses `bun --env-file=.env.test src/index.ts` (cwd: server/), client uses `npm run dev` (cwd: client/)

## Run command

```sh
PATH=~/.nvm/versions/node/v22.22.3/bin:$PATH bun run test:e2e
```

(Node 22 required for Playwright; default shell has Node 16 which is too old). Can also
run `bunx playwright test <file>` directly with the same PATH prefix for a single spec.

## Test database

- Name: `helpdesk_test`
- URL: `postgresql://helpdesk:helpdesk@localhost:5432/helpdesk_test`
- Env file: `server/.env.test`
- Tables truncated in teardown: `"message", "ticket", "knowledge_base", verification, session, account, "user"` — **all lowercase**, matching `@@map(...)` in `schema.prisma` for every model (domain models included, as of the `20260705062500_lowercase_domain_table_names` migration). `e2e/global-teardown.ts` previously still referenced PascalCase `"Message"`/`"Ticket"`/`"KnowledgeBase"` and errored with `relation "Message" does not exist` on every run — fixed 2026-07-08. If you ever see that error again, check `schema.prisma`'s `@@map` values against the TRUNCATE statement in `global-teardown.ts` — they must match exactly.
- When teardown silently fails (e.g. due to the casing bug above), stale rows persist across runs and can cause flaky failures in *other* tests days later that assume a clean DB (e.g. hardcoded non-unique names colliding with earlier leftover rows) — worth checking teardown's actual exit status if you see unexplained strict-mode-locator "2 elements found" failures on a test that looks otherwise correct.

## Global setup (`e2e/global-setup.ts`)

1. Creates `helpdesk_test` DB if missing
2. Runs `prisma migrate deploy` against it
3. Runs `bun --env-file=.env.test src/seed-test.ts` to seed test users

Seeded users come from env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_AGENT_EMAIL`, `TEST_AGENT_PASSWORD` in `server/.env.test`.

## Global teardown (`e2e/global-teardown.ts`)

TRUNCATEs all tables (see exact list above) with RESTART IDENTITY CASCADE after the full test run.

## Test helpers

- `e2e/helpers/auth.ts` — `loginAs(page, email, password)`, `ADMIN`, `AGENT` constants, `logout(page)`, `submitFormBypassingBrowserValidation(page)`, `expectLoginPage`, `expectHomePage`, `expectUsersPage`

## API seeding pattern (for beforeEach)

When a test needs pre-existing data (e.g., a user to edit or delete), seed it via the `request` fixture — NOT through the UI. The `request` and `page` fixtures are independent browser contexts; cookies set in `request` do NOT carry over to `page`, but sequential calls made on the *same* `request` fixture instance within one test (including its `beforeEach`) DO share cookies — confirmed both for UI-flow tests and for pure API/webhook tests with no `page` at all (see [[project_api_only_endpoints]]). Pattern:

```ts
test.beforeEach(async ({ request }) => {
  // 1. Sign in via API so subsequent requests carry the session cookie
  const signIn = await request.post('/api/auth/sign-in/email', {
    data: { email: ADMIN.email, password: ADMIN.password },
  });
  expect(signIn.ok()).toBeTruthy();

  // 2. Seed the test data
  const create = await request.post('/api/users', {
    data: { name: testUserName, email: testUserEmail, password: 'TestPass123!' },
  });
  expect(create.status()).toBe(201);
});

test('...', async ({ page }) => {
  // request cookies don't carry here; log in via UI for browser session
  await loginAs(page, ADMIN.email, ADMIN.password);
  // ...
});
```

Confirmed working in `create-user.spec.ts` (agent-cannot-POST test) and `user-management.spec.ts`.

For fully API-only specs (no `page`, e.g. `email-webhook.spec.ts`), see [[project_api_only_endpoints]] for the full pattern (multipart requests, asserting via read endpoints instead of a raw DB client).

## Dev servers block Playwright's webServer

`reuseExistingServer: false` on both webServer entries (backend :3000, frontend :5173) means `bun run test:e2e` fails immediately with `Error: http://localhost:3000 is already used...` if the user's own dev servers (`bun run dev:server`, `cd client && vite`) are already running on those ports — it does not wait or queue.

Before running the suite, check `lsof -i :3000 -i :5173` for LISTEN entries and inspect `/proc/<pid>/cwd` (dev processes have cwd `server/` or `client/`). If found, `kill` them, run the tests, then **restart them afterward** so the user's dev environment is unaffected:
```sh
nohup bash -c 'cd /path/to/repo && bun run dev:server' > /tmp/dev-server.log 2>&1 & disown
nohup bash -c 'cd /path/to/repo/client && PATH=~/.nvm/versions/node/v22.22.3/bin:$PATH node_modules/.bin/vite' > /tmp/dev-client.log 2>&1 & disown
```
Gotcha: backgrounding a compound `cd x && cmd &` runs the `cd` in a forked subshell — it does **not** persist to the outer shell's cwd for later lines in the same multi-line Bash call. Wrap the whole `cd ... && cmd` inside `bash -c '...'` when backgrounding rather than relying on a bare `cd` earlier in the script.

Exception observed 2026-07-11: found only a *solo* orphaned `node node_modules/.bin/vite` process bound to :5173 (cwd `client/`), no matching backend on :3000. Command line was byte-for-byte the playwright webServer client command, and it had been running ~1h with no backend counterpart — almost certainly a leftover from a previous interrupted `test:e2e` run (Playwright normally kills its own webServer processes on exit, but a hard-interrupted run can leave them behind), not a real manual dev session (a real one needs both `dev:server` and `vite` per the top-level dev commands). Killed it without restarting — a solo frontend-only process with no backend is safe to treat as an orphan; only restart-after if you found a genuine matched pair (both :3000 and :5173 alive) before you started.

## App-wide QueryClient has no `retry: false` — error-state assertions need a longer timeout

`client/src/main.tsx` creates `new QueryClient()` with **no** custom `defaultOptions` — unlike Vitest's `renderWithQuery.tsx`, which explicitly passes `{ queries: { retry: false } }`. In the real browser, a failing query — including a clean 404 — retries 3 times with TanStack Query's default exponential backoff (~1s+2s+4s ≈ 7s) before the error UI renders. The default `expect(...).toBeVisible()` 5s timeout is too tight for asserting error/not-found states reached via a real failed fetch (e.g. TicketDetailPage's "Ticket not found."); bump to `{ timeout: 15_000 }` for those specific assertions instead of treating it as flakiness.

## Known bug (not fixed, out of scope when found)

`create-user.spec.ts` line ~50: `page.getByRole("cell", { name: "Jane Smith" })` is missing `{ exact: true }`, causing a strict-mode violation against the row-actions cell (whose accessible name is `"Edit Jane Smith Delete Jane…"`). Every other spec in the suite (`user-management.spec.ts`) correctly uses `exact: true` for this. Noticed while running the full suite on 2026-07-08; not fixed since it was unrelated to the task at hand — fix it if asked to touch that file.
