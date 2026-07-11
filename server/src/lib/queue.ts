import { PgBoss } from "pg-boss";

// Shared pg-boss instance, backed by the same Postgres database as the app — jobs are durable
// (survive a server restart) and get automatic retries, unlike a bare fire-and-forget promise.
export const boss = new PgBoss(process.env.DATABASE_URL!);

boss.on("error", (err: Error) => {
  console.error("pg-boss error:", err);
});

export async function startQueue(): Promise<void> {
  await boss.start();
}
