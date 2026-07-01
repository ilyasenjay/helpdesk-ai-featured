import { execSync } from "child_process";
import path from "path";
import type { FullConfig } from "@playwright/test";

const TEST_DB_NAME = "helpdesk_test";
const TEST_DB_BASE_URL = "postgresql://helpdesk:helpdesk@localhost:5432";
const POSTGRES_MAINTENANCE_URL = `${TEST_DB_BASE_URL}/postgres`;
const TEST_DB_URL = `${TEST_DB_BASE_URL}/${TEST_DB_NAME}?schema=public`;

const SERVER_DIR = path.resolve(__dirname, "../server");

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // 1. Create test database (idempotent — catch duplicate DB error)
  console.log("[e2e:setup] Ensuring test database exists...");
  try {
    execSync(
      `psql "${POSTGRES_MAINTENANCE_URL}" -c "CREATE DATABASE ${TEST_DB_NAME}"`,
      { stdio: "pipe" }
    );
    console.log(`[e2e:setup] Created database: ${TEST_DB_NAME}`);
  } catch {
    console.log(`[e2e:setup] ${TEST_DB_NAME} already exists — continuing`);
  }

  // 2. Run Prisma migrations against the test database
  console.log("[e2e:setup] Running Prisma migrations...");
  execSync(`bun node_modules/prisma/build/index.js migrate deploy`, {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });

  // 3. Seed admin and agent test users
  console.log("[e2e:setup] Seeding test users...");
  execSync(`bun --env-file=.env.test src/seed-test.ts`, {
    cwd: SERVER_DIR,
    stdio: "inherit",
  });

  console.log("[e2e:setup] Global setup complete.");
}
