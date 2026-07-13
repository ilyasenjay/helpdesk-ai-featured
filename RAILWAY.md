# Deploying to Railway

Single Railway service: the Dockerfile builds the client and bundles it into the same Bun/Express
container that serves the API, so the app is one deployable unit on one domain. Add Railway's
Postgres plugin for the database.

## Setup

1. **New Project → Deploy from GitHub repo** (this repo). Railway detects `railway.json` and
   builds with the root `Dockerfile` — no other build config needed.
2. **Add a Postgres plugin** to the project. Railway injects `DATABASE_URL` into the service
   automatically — don't set it manually.
3. **Set the service's public domain first** (Settings → Networking → Generate Domain, or attach a
   custom domain), then set the env vars below using that domain for `BETTER_AUTH_URL`/`CLIENT_URL`.
4. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` (see below) and deploy. On every start, the container runs
   `bun run db:deploy` (`prisma migrate deploy`) then `bun run db:seed` before `bun run start` —
   migrations and the admin account are both handled automatically, no separate release step or
   manual seed command needed. The seed is idempotent (skips if `ADMIN_EMAIL` already exists), so
   it's safe to leave these vars set permanently — every fresh deploy/database always has a
   working admin login.

## Environment variables

### Required

| Variable | Value |
|---|---|
| `DATABASE_URL` | Set automatically by the Railway Postgres plugin — don't set by hand |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | The service's public URL, e.g. `https://helpdesk-production.up.railway.app` |
| `CLIENT_URL` | Same as `BETTER_AUTH_URL` — client and API are same-origin in this topology |

### Required — admin login

| Variable | Value |
|---|---|
| `ADMIN_EMAIL` | Email for the admin account, auto-seeded (or confirmed to already exist) on every start |
| `ADMIN_PASSWORD` | Password for that admin account |

### Optional features (omit to leave the feature disabled)

| Variable | Enables |
|---|---|
| `SENTRY_DSN` | Server-side error tracking |
| `VITE_SENTRY_DSN` | Client-side error tracking — must be set as a **build-time** var (Railway build args), since Vite inlines it at build time |
| `GROQ_API_KEY`, `GROQ_MODEL` | The "Polish" reply button |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Inbound email via Mailgun webhook |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_ADDRESS` | Inbound email via Gmail polling |
| `GMAIL_SMTP_APP_PASSWORD` | Outbound email replies via Gmail SMTP |

`PORT` and `NODE_ENV` don't need to be set — Railway injects `PORT` automatically and the
Dockerfile hardcodes `NODE_ENV=production`.

## Notes

- Healthcheck: `GET /api/health` (configured in `railway.json`).
- `trust proxy` is enabled in Express — required for Better Auth's secure cookies and
  `express-rate-limit`'s IP detection to work correctly behind Railway's edge proxy.
- Gmail polling and the pg-boss queue workers start automatically with the server — no separate
  worker service needed.
- Every image build/run always has a working admin login: `server/src/seed.ts` runs on every
  container start (Dockerfile `CMD`) and is idempotent, so it's safe with `ADMIN_EMAIL`/
  `ADMIN_PASSWORD` left set indefinitely — a fresh database always gets that admin created, an
  existing one is left untouched.
