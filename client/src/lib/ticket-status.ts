export enum TicketStatus {
  open = "open",
  resolved = "resolved",
  closed = "closed",
}

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};
