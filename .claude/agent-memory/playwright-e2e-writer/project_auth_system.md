---
name: project_auth_system
description: Auth system facts — test users, route guards, Better Auth cookie scope, sign-up disabled
metadata:
  type: project
---

## Test users (seeded by global-setup via seed-test.ts)

- Admin: `admin@e2etest.local` / `AdminPass123!`, name "Test Admin", role `admin`
- Agent: `agent@e2etest.local` / `AgentPass123!`, name "Test Agent", role `agent`

These live in `e2e/helpers/auth.ts` as `ADMIN` and `AGENT` constants.

## Route guards

- `ProtectedRoute` — wraps all authenticated routes; redirects unauthenticated users to `/login`; shows "Loading…" briefly while `isPending` is true
- `AdminRoute` — nested inside ProtectedRoute; redirects non-admin users to `/` (not `/login`)
- Login page (`/login`) — does NOT check for existing session, so a logged-in user visiting `/login` stays there

## Route tree

- `/login` — public
- `/` — ProtectedRoute > Layout > HomePage
- `/users` — ProtectedRoute > Layout > AdminRoute > UsersPage

## Better Auth

- Sign-up is disabled (`disableSignUp: true`)
- Auth client uses `baseURL: "http://localhost:5173"` (Vite proxy) — cookies are scoped to this origin
- Sign-in endpoint proxied to: `/api/auth/sign-in/email`
- Sign-out: `authClient.signOut()` then `navigate('/login')`
- Session: `authClient.useSession()` returns `{ data: session, isPending }`
- `session.user.role` — either `"admin"` or `"agent"`
- `session.user.name` — displayed in NavBar

## loginAs helper

`e2e/helpers/auth.ts` exports `loginAs(page, email, password)` — navigates to /login, fills form, clicks submit, waits for `waitForURL('/')`.
