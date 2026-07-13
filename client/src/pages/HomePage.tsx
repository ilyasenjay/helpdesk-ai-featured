import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import StatCard from "../components/StatCard";
import TicketsPerDayChart from "../components/TicketsPerDayChart";
import type { DailyTicketCount, DashboardStats } from "../lib/dashboard";
import { formatDuration } from "../lib/dashboard";

async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await axios.get<DashboardStats>("/api/dashboard/stats", { withCredentials: true });
  return res.data;
}

async function fetchTicketsPerDay(): Promise<DailyTicketCount[]> {
  const res = await axios.get<{ ticketsPerDay: DailyTicketCount[] }>("/api/dashboard/tickets-per-day", {
    withCredentials: true,
  });
  return res.data.ticketsPerDay;
}

export default function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
  });

  const { data: ticketsPerDay, isLoading: isTicketsPerDayLoading } = useQuery({
    queryKey: ["dashboard", "tickets-per-day"],
    queryFn: fetchTicketsPerDay,
  });

  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!error && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total tickets" value={String(data?.totalTickets ?? 0)} isLoading={isLoading} />
          <StatCard label="Open tickets" value={String(data?.openTickets ?? 0)} isLoading={isLoading} />
          <StatCard
            label="Resolved by AI"
            value={String(data?.resolvedByAiCount ?? 0)}
            isLoading={isLoading}
          />
          <StatCard
            label="% resolved by AI"
            value={`${(data?.resolvedByAiPercent ?? 0).toFixed(1)}%`}
            isLoading={isLoading}
          />
          <StatCard
            label="Avg. resolution time"
            value={formatDuration(data?.avgResolutionTimeMs ?? null)}
            isLoading={isLoading}
          />
        </div>
      )}

      <TicketsPerDayChart data={ticketsPerDay} isLoading={isTicketsPerDayLoading} />
    </div>
  );
}
