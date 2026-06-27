import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { Role } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  process.exit(1);
}

async function seed() {
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
      VALUES (${userId}, 'Admin', ${email}, false, ${now}, ${now}, ${Role.admin})
    `,
    prisma.$executeRaw`
      INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES (${accountId}, ${email}, 'credential', ${userId}, ${passwordHash}, ${now}, ${now})
    `,
  ]);

  console.log(`✓ Admin user created: ${email}`);
}

seed()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
