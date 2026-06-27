import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db";
import { Role } from "../generated/prisma/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  trustedOrigins: [process.env.CLIENT_URL!],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: Role.agent,
        input: false,
      },
    },
  },
});
