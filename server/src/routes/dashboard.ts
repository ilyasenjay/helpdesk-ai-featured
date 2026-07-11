import { Router } from "express";
import { requireAuth } from "../lib/requireAuth";
import prisma from "../lib/db";

const router = Router();

interface DashboardStatsRow {
  total_tickets: bigint;
  open_tickets: bigint;
  resolved_by_ai_count: bigint;
  resolved_by_ai_percent: number;
  avg_resolution_time_ms: number | null;
}

router.get("/stats", requireAuth, async (_req, res) => {
  // get_dashboard_stats() is an aggregate query with no GROUP BY, so it always returns exactly one row.
  const [stats] = await prisma.$queryRaw<DashboardStatsRow[]>`SELECT * FROM get_dashboard_stats()`;
  if (!stats) throw new Error("get_dashboard_stats() returned no rows");

  res.json({
    totalTickets: Number(stats.total_tickets),
    openTickets: Number(stats.open_tickets),
    resolvedByAiCount: Number(stats.resolved_by_ai_count),
    resolvedByAiPercent: stats.resolved_by_ai_percent,
    avgResolutionTimeMs: stats.avg_resolution_time_ms,
  });
});

const TICKETS_PER_DAY_WINDOW = 30;

router.get("/tickets-per-day", requireAuth, async (_req, res) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (TICKETS_PER_DAY_WINDOW - 1));

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < TICKETS_PER_DAY_WINDOW; i++) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    counts.set(date.toISOString().slice(0, 10), 0);
  }
  for (const ticket of tickets) {
    const key = ticket.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ticketsPerDay = Array.from(counts, ([date, count]) => ({ date, count }));
  res.json({ ticketsPerDay });
});

export default router;
