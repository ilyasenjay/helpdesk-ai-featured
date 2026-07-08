import { execSync } from "child_process";
import type { FullConfig } from "@playwright/test";

const TEST_DB_URL =
  "postgresql://helpdesk:helpdesk@localhost:5432/helpdesk_test";

export default async function globalTeardown(_config: FullConfig): Promise<void> {
  console.log("[e2e:teardown] Truncating test database tables...");
  // Single-quote the SQL so double-quoted names are preserved by the shell.
  // All tables (Better Auth and domain models alike) are mapped to lowercase
  // snake_case names via @@map in schema.prisma.
  execSync(
    `psql "${TEST_DB_URL}" -c 'TRUNCATE TABLE "message", "ticket", "knowledge_base", verification, session, account, "user" RESTART IDENTITY CASCADE'`,
    { stdio: "inherit" }
  );
  console.log("[e2e:teardown] Teardown complete.");
}
