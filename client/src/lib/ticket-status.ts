export enum TicketStatus {
  new = "new",
  processing = "processing",
  open = "open",
  resolved = "resolved",
  closed = "closed",
}

export const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.new]: "New",
  [TicketStatus.processing]: "Processing",
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};
