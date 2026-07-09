import { Skeleton } from "./ui/skeleton";
import { TicketStatus } from "../lib/ticket-status";
import { TicketCategory } from "../lib/ticket-category";
import type { Ticket } from "../lib/tickets";

interface TicketsTableProps {
  tickets: Ticket[];
}

export function TicketsTable({ tickets }: TicketsTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Subject</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket, i) => (
            <tr key={ticket.id} className={i < tickets.length - 1 ? "border-b" : ""}>
              <td className="px-4 py-3 font-medium">{ticket.subject}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {ticket.senderName}
                {ticket.customerEmail && (
                  <span className="block text-xs">{ticket.customerEmail}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {ticket.category ? categoryLabels[ticket.category] : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TicketsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {["Subject", "From", "Status", "Category", "Created"].map((col) => (
              <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className={i < 4 ? "border-b" : ""}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.generalQuestion]: "General Question",
  [TicketCategory.technicalQuestion]: "Technical Question",
  [TicketCategory.refundRequest]: "Refund Request",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.open]: "bg-primary/10 text-primary",
    [TicketStatus.resolved]: "bg-green-100 text-green-700",
    [TicketStatus.closed]: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
