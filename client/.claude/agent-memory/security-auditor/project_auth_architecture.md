---
name: project-auth-architecture
description: Auth/authz architecture — Better Auth email/password, PostgreSQL sessions, role enforcement gaps, and key security controls in place
metadata:
  type: project
---

## Authentication Architecture

Better Auth v1 with email/password only. Public sign-up is disabled (`disableSignUp: true`) — only the seed script creates users. Sessions stored in PostgreSQL via Prisma adapter.

- Auth server config: `server/src/lib/auth.ts`
- Auth middleware: `server/src/lib/requireAuth.ts` (validates session via Better Auth, attaches `req.user` and `req.session`)
- Auth client config: `client/src/lib/auth.ts` — `baseURL: "http://localhost:5173"` routes through Vite proxy
- Roles: `admin` and `agent` enum stored in the `user` table
- Role field has `input: false` — cannot be set by client during sign-up or profile update (positive control)

## Authorization Architecture

- `ProtectedRoute` (`client/src/components/ProtectedRoute.tsx`): checks `session` exists via `authClient.useSession()`, redirects to `/login` if not
- `AdminRoute` (`client/src/components/AdminRoute.tsx`): checks `session?.user.role === "admin"`, redirects to `/` if not admin
- Route tree: `/login` (public) → `ProtectedRoute` → `Layout` → `AdminRoute` → `/users`

**Critical gap:** `requireAuth` middleware enforces authentication server-side, but there is NO `requireAdmin` middleware. Admin role is enforced client-side only. Any admin API routes added without explicit `req.user.role === 'admin'` checks will be accessible to all authenticated users.

## API Routes (as of audit)

- `GET /api/health` — public
- `GET /api/me` — auth-protected; returns full `req.user` and `req.session` objects including session token
- `POST /api/auth/*` — handled by Better Auth's `toNodeHandler`

## Known Security Gaps (from 2026-06-29 audit)

1. No `requireAdmin` middleware exists — must be created before any admin API routes are added
2. `GET /api/me` exposes `session.token` in JSON body, partially undermining `HttpOnly` cookie protection
3. CORS origin hardcoded to `http://localhost:5173` in `server/src/index.ts:10` — not env-configurable
4. No Helmet.js — no HTTP security headers
5. `BETTER_AUTH_SECRET="AbC123"` in `.env.example` — dangerously weak placeholder
6. `trustedOrigins: [process.env.CLIENT_URL!]` — unvalidated env var; undefined would become the string `"undefined"`
7. No rate limiting on custom API routes (Better Auth handles its own endpoints internally)

## Positive Controls in Place

- `disableSignUp: true` — no public registration
- `role` field `input: false` — role cannot be set via client
- `.env` excluded from git (confirmed in `.gitignore`)
- Session validated against PostgreSQL on every request (not just JWT signature check)
- Seed script uses Prisma parameterized raw queries (safe from SQL injection)

**Why:** Recorded immediately after first auth/authz audit on 2026-06-29.
**How to apply:** Use this when building new API routes to know what middleware exists, and to remind developer that `requireAdmin` must be built before admin endpoints go live.
