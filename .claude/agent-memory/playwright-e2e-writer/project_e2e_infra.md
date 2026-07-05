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

(Node 22 required for Playwright; default shell has Node 16 which is too old)

## Test database

- Name: `helpdesk_test`
- URL: `postgresql://helpdesk:helpdesk@localhost:5432/helpdesk_test`
- Env file: `server/.env.test`
- Tables truncated in teardown: `"Message", "Ticket", "KnowledgeBase", verification, session, account, "user"`

## Global setup (`e2e/global-setup.ts`)

1. Creates `helpdesk_test` DB if missing
2. Runs `prisma migrate deploy` against it
3. Runs `bun --env-file=.env.test src/seed-test.ts` to seed test users

Seeded users come from env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TEST_AGENT_EMAIL`, `TEST_AGENT_PASSWORD` in `server/.env.test`.

## Global teardown (`e2e/global-teardown.ts`)

TRUNCATEs all tables with RESTART IDENTITY CASCADE after the full test run.

## Test helpers

- `e2e/helpers/auth.ts` — `loginAs(page, email, password)`, `ADMIN`, `AGENT` constants, `logout(page)`, `submitFormBypassingBrowserValidation(page)`, `expectLoginPage`, `expectHomePage`, `expectUsersPage`

## API seeding pattern (for beforeEach)

When a test needs pre-existing data (e.g., a user to edit or delete), seed it via the `request` fixture — NOT through the UI. The `request` and `page` fixtures are independent browser contexts; cookies set in `request` do NOT carry over to `page`. Pattern:

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
