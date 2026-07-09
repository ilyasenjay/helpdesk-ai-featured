import { TicketStatus } from "./ticket-status";
import { TicketCategory } from "./ticket-category";

export enum MessageSender {
  customer = "CUSTOMER",
  agent = "AGENT",
  ai = "AI",
}

export interface Message {
  id: string;
  body: string;
  sender: MessageSender;
  ticketId: number;
  userId: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  senderName: string;
  customerEmail: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  body: string;
  aiSummary: string | null;
  messages: Message[];
}

export type TicketSortColumn = "subject" | "senderName" | "status" | "category" | "createdAt";

export type TicketCategoryFilter = TicketCategory | "NONE";

export const ticketPageSizes = [10, 20, 50, 100] as const;
export type TicketPageSize = (typeof ticketPageSizes)[number];

export interface TicketsPage {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}
