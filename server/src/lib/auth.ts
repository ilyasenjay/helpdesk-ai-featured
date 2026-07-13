import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import prisma from "./db";
import { Role } from "../generated/prisma/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [process.env.CLIENT_URL!],
  // Without this, Better Auth can't determine per-client IPs behind Railway's proxy and silently
  // degrades every route's rate limit to a single bucket shared by *all* users (it logs a WARN
  // for this, easy to miss). That meant one user's testing traffic could exhaust the shared
  // /api/auth/get-session bucket and rate-limit a completely different user's session check right
  // after a successful sign-in — looking like "sign in does nothing the first time" with no
  // visible error, since the failure happens in ProtectedRoute's session check, not the login
  // form's own error state. Express's own `trust proxy` (index.ts) doesn't cover this — Better
  // Auth's rate limiter reads the header directly, not through Express's req.ip.
  //
  // x-real-ip, not x-forwarded-for: Railway's edge sets x-forwarded-for as a chain (client,
  // <railway-edge-ip>), and that edge IP rotates per-request (confirmed by observation — not a
  // fixed value), so there's no stable `trustedProxies` entry that would let Better Auth safely
  // pick the right hop out of that chain. x-real-ip is a single clean value (just the client),
  // sidestepping the whole trusted-chain problem.
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-real-ip"],
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: Role.agent,
        input: false,
      },
    },
  },
  plugins: [admin({ defaultRole: Role.agent })],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true },
          });
          if (user?.deletedAt) return false;
        },
      },
    },
  },
});
