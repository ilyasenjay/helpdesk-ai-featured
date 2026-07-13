import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { generateId } from "better-auth";
import { Role } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

// Runs on every container start (see Dockerfile CMD) so a fresh deploy always has an accessible
// admin account — exits 0 rather than failing the startup chain when the vars aren't set, since
// they're optional after the first admin has been created.
if (!email || !password) {
  console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.");
  process.exit(0);
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
