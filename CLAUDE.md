# Helpdesk — Project Memory

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (port 5173)
- **Backend**: Express 5 + TypeScript, runtime: Bun (port 3000)
- **Database**: PostgreSQL + Prisma
- **AI**: Anthropic Claude API (`claude-opus-4-8`)
- **Email**: SendGrid or Mailgun (inbound webhooks)
- **Styling**: Tailwind CSS v4 + shadcn/ui (base-nova style, neutral theme)
- **Deployment**: Docker

## Project Structure

```
new-helpdesk/
├── client/        # React + TypeScript + Vite
│   └── src/
└── server/        # Express + TypeScript (Bun runtime)
    └── src/
        └── index.ts
```

## Dev Commands

```sh
# Server (hot reload via Bun)
bun run dev:server

# Client — must use Node 22; bun run dev:client fails (crypto API mismatch)
cd client && PATH=~/.nvm/versions/node/v22.22.3/bin:$PATH node_modules/.bin/vite
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:3000`.

## Documentation

Always use context7 to fetch up-to-date documentation for any library, framework, or tool used in this project — including Express, React, Vite, Prisma, Tailwind, and the Anthropic SDK. Add `use context7` to any prompt that involves library APIs, configuration, or version-specific behavior.

## Conventions

- All source files are TypeScript — no plain `.js`
- Server runs directly with Bun (no compile step)
- Use `bun` instead of `node`, `bun install` instead of `npm install`, `bunx` instead of `npx`
- Environment variables live in `server/.env` (Bun loads them automatically — no dotenv)
- REST API routes are prefixed with `/api`
- Always use context7 for library/framework docs — add `use context7` to any prompt involving APIs, config, or version-specific behavior

## shadcn/ui

- Components live in `client/src/components/ui/`
- Adding components requires Node 22 (default shell uses Node 16 which is too old):
  ```sh
  PATH=~/.nvm/versions/node/v22.22.3/bin:$PATH npx shadcn@latest add <component>
  ```
- The `base-nova` style generates `Input` using `@base-ui/react/input` which does **not** forward refs — this breaks react-hook-form. Always use a native `<input>` with `React.forwardRef` instead (see `client/src/components/ui/input.tsx`).

## E2E Testing (Playwright)

See `.claude/agents/playwright-e2e-writer.md` for the full test infrastructure details (run command, test DB, test users, table name casing, webServer config).

**Always use the `playwright-e2e-writer` agent to write e2e tests** — never write them inline. Use it:
- After completing a new page or feature
- When the user asks for test coverage on any UI flow
- For authentication flows, form submissions, route protection, and API-driven UI changes

To invoke: mention "write e2e tests" or "test this" and the agent will be launched automatically. The agent knows the full test infrastructure and writes production-ready, non-flaky Playwright tests.

## Better Auth

- Auth client (`client/src/lib/auth.ts`) uses `baseURL: "http://localhost:5173"` so requests go through the Vite proxy — do **not** point it directly at `localhost:3000` or cookies will be scoped to the wrong origin.
- Prisma CLI must be run via `bun node_modules/prisma/build/index.js` — `bunx prisma` fails on Node 16.
- `inferAdditionalFields<typeof auth>()` is added as a plugin to the auth client so `session.user.role` is properly typed — no manual type cast needed.
- User roles: `admin` and `agent`. Role is set server-side only (`input: false`) — clients cannot escalate their own role.

## Authorization

- `AdminRoute` (`client/src/components/AdminRoute.tsx`) guards admin-only client routes — nest it inside `ProtectedRoute` in `App.tsx`.
- `requireAdmin` (`server/src/lib/requireAdmin.ts`) guards admin-only API routes — always apply **after** `requireAuth`:
  ```ts
  app.get("/api/users", requireAuth, requireAdmin, handler);
  ```
- Client-side guards (AdminRoute, navbar role check) are UX only — server-side `requireAdmin` is the real security control.

## Security

- `helmet()` is the first middleware — sets `X-Frame-Options`, `CSP`, `HSTS`, etc.
- CORS origin is read from `process.env.CLIENT_URL` (not hardcoded).
- Rate limiting (`express-rate-limit`, 200 req/15 min on `/api/*`) is **production only** — guarded by `process.env.NODE_ENV === "production"`.
- `server/src/lib/env.ts` validates all required env vars on startup and exits if any are missing.
- `/api/me` returns only `{ user }` — never expose `req.session` (contains the raw session token).
