import { statusBadgeStyles } from "../TicketsTable";
import { TicketStatus } from "../../lib/ticket-status";

export function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-4 h-4 w-32 rounded bg-muted" />
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className={`h-6 w-16 rounded-full ${statusBadgeStyles[TicketStatus.open]}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <div className="space-y-6">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
