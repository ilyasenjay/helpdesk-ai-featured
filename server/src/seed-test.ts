import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { Role } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seedUser(
  email: string,
  password: string,
  name: string,
  role: Role
): Promise<void> {
  const existing = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "user" WHERE email = ${email} LIMIT 1
  `;

  if (existing.length > 0) {
    console.log(`User ${email} already exists — skipping.`);
    return;
  }

  const userId = generateId();
  const accountId = generateId();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  await prisma.$transaction([
    prisma.$executeRaw`
      INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role)
      VALUES (${userId}, ${name}, ${email}, false, ${now}, ${now}, ${role})
    `,
    prisma.$executeRaw`
      INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES (${accountId}, ${email}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now})
    `,
  ]);

  console.log(`✓ ${role} user seeded: ${email}`);
}

async function seed(): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD } =
    process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !TEST_AGENT_EMAIL || !TEST_AGENT_PASSWORD) {
    console.error(
      "Missing env vars: ADMIN_EMAIL, ADMIN_PASSWORD, TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD"
    );
    process.exit(1);
  }

  await seedUser(ADMIN_EMAIL, ADMIN_PASSWORD, "Test Admin", Role.admin);
  await seedUser(TEST_AGENT_EMAIL, TEST_AGENT_PASSWORD, "Test Agent", Role.agent);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
