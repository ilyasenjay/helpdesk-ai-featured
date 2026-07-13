# syntax=docker/dockerfile:1

# ---- builder: one stage for everything, to avoid copying node_modules across stages ----
FROM oven/bun:1 AS builder
WORKDIR /app

# Node 22 is needed only to run tsc/vite — Bun's crypto shim breaks Vite's build. Fetched
# straight from the official tarball (not apt/nodesource) to keep this layer small; ADD's
# remote-URL support is used instead of curl, which isn't present in this base image.
ADD https://nodejs.org/dist/v22.22.3/node-v22.22.3-linux-x64.tar.gz /tmp/node.tar.gz
RUN tar -xzf /tmp/node.tar.gz -C /usr/local --strip-components=1 \
  && rm /tmp/node.tar.gz

COPY package.json bun.lock ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN bun install --frozen-lockfile

COPY server ./server
COPY client ./client

WORKDIR /app/server
RUN bun run db:generate

# client/src/lib/auth.ts does a type-only import of the server's `auth` instance (for
# inferAdditionalFields), which is why the server workspace has to exist alongside client/
# in this same stage for tsc to resolve it.
WORKDIR /app/client
RUN node node_modules/.bin/tsc && node node_modules/.bin/vite build

# ---- runtime: only the artifacts actually needed to run the server ----
FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3000

# db:seed is idempotent (skips if ADMIN_EMAIL already exists) and no-ops if ADMIN_EMAIL/
# ADMIN_PASSWORD aren't set — safe to run on every start so a fresh deploy always has a
# working admin login. Set ADMIN_EMAIL/ADMIN_PASSWORD whenever running this image.
CMD ["sh", "-c", "bun run db:deploy && bun run db:seed && bun run start"]
