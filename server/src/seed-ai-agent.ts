import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateId } from "better-auth";
import { Role } from "./generated/prisma/client";
import { AI_AGENT_EMAIL, AI_AGENT_NAME } from "./lib/ai/agent";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seed(): Promise<void> {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "user" WHERE email = ${AI_AGENT_EMAIL} LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`AI agent (${AI_AGENT_EMAIL}) already exists — skipping.`);
    return;
  }

  const userId = generateId();
  const now = new Date();

  // No `account` row — the AI agent is a system identity used only for ticket assignment, never
  // for login.
  await prisma.$executeRaw`
    INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
    VALUES (${userId}, ${AI_AGENT_NAME}, ${AI_AGENT_EMAIL}, true, ${now}, ${now}, ${Role.agent})
  `;

  console.log(`✓ AI agent created: ${AI_AGENT_EMAIL}`);
}

seed()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
