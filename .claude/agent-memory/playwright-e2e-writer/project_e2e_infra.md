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

- `e2e/helpers/auth.ts` — `loginAs(page, email, password)`, `ADMIN`, `AGENT` constants
