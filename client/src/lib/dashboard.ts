export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedByAiCount: number;
  resolvedByAiPercent: number;
  avgResolutionTimeMs: number | null;
}

export interface DailyTicketCount {
  date: string;
  count: number;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";

  const minutes = Math.round(ms / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}
