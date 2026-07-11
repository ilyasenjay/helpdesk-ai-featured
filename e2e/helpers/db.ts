import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Direct-DB ticket seeding for e2e tests.
// ---------------------------------------------------------------------------
// There is no POST /api/tickets — the only HTTP-reachable way to create a
// ticket is the inbound-email webhook (POST /api/webhooks/email, see
// createTestTicket() in ticket-detail.spec.ts). That path always starts a
// ticket at status "new" and immediately enqueues a real pg-boss job
// (attemptAutoResolveTicket, server/src/lib/ai/resolve.ts) that races against
// the test. Since server/.env.test has no GROQ_API_KEY, that job
// deterministically short-circuits to status "open" without ever touching
// "processing" or resolvedByAi — meaning "new", "processing", and
// resolvedByAi: true are either racy or entirely unreachable through any
// HTTP-reachable path in this test env.
//
// To test the AI-auto-resolution UI states deterministically, seed rows
// directly via raw SQL against the test DB, bypassing the webhook and the
// pg-boss worker entirely (the worker only ever acts on tickets it enqueued
// itself — a directly-inserted row is never picked up).

const TEST_DB_URL = "postgresql://helpdesk:helpdesk@localhost:5432/helpdesk_test";

export const pool = new Pool({ connectionString: TEST_DB_URL });

export type SeedTicketStatus = "new" | "processing" | "open" | "resolved" | "closed";
export type SeedTicketCategory = "GENERAL_QUESTION" | "TECHNICAL_QUESTION" | "REFUND_REQUEST";

export interface SeedTicketOptions {
  subject?: string;
  body?: string;
  senderName?: string;
  customerEmail?: string;
  status?: SeedTicketStatus;
  resolvedByAi?: boolean;
  category?: SeedTicketCategory | null;
  assignedToId?: string | null;
  /** Insert the first CUSTOMER message too, mirroring a webhook-created ticket. Default true. */
  withMessage?: boolean;
}

export interface SeedTicket {
  id: number;
  subject: string;
  body: string;
  senderName: string;
  customerEmail: string;
  status: SeedTicketStatus;
  resolvedByAi: boolean;
}

let seedCounter = 0;

function uniqueSuffix(): string {
  seedCounter += 1;
  return `${Date.now()}-${seedCounter}-${Math.floor(Math.random() * 9999)}`;
}

/** Insert a Ticket (+ optional first CUSTOMER Message) directly into the test DB. */
export async function seedTicket(options: SeedTicketOptions = {}): Promise<SeedTicket> {
  const suffix = uniqueSuffix();
  const subject = options.subject ?? `E2E Seeded Ticket ${suffix}`;
  const body = options.body ?? "I need help with my account.";
  const senderName = options.senderName ?? "Jane Customer";
  const customerEmail = options.customerEmail ?? `e2e-seed-${suffix}@customer.local`;
  const status = options.status ?? "open";
  const resolvedByAi = options.resolvedByAi ?? false;
  const category = options.category ?? null;
  const assignedToId = options.assignedToId ?? null;

  const result = await pool.query<{ id: number }>(
    `INSERT INTO "ticket"
       (subject, body, "senderName", "customerEmail", status, "resolvedByAi", category, "assignedToId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::"TicketStatus", $6, $7::"TicketCategory", $8, NOW(), NOW())
     RETURNING id`,
    [subject, body, senderName, customerEmail, status, resolvedByAi, category, assignedToId]
  );
  const id = result.rows[0]!.id;

  if (options.withMessage !== false) {
    await pool.query(
      `INSERT INTO "message" (id, body, sender, "ticketId", "createdAt")
       VALUES ($1, $2, 'CUSTOMER'::"MessageSender", $3, NOW())`,
      [randomUUID(), body, id]
    );
  }

  return { id, subject, body, senderName, customerEmail, status, resolvedByAi };
}

/** Close the pg Pool. Call from a test.afterAll in any spec file that imports seedTicket. */
export async function closeDbPool(): Promise<void> {
  await pool.end();
}
