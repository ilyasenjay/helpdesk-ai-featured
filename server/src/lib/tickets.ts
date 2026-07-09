import { z } from "zod";
import { TicketStatus, TicketCategory } from "../generated/prisma/client";

export const inboundEmailSchema = z.object({
  from: z.email({ error: "Invalid email address" }),
  fromName: z.string().trim().min(1, { error: "Sender name is required" }),
  subject: z.string().trim().min(1, { error: "Subject is required" }),
  body: z.string().min(1, { error: "Body is required" }),
  bodyHtml: z.string().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

export const ticketSortColumns = ["subject", "senderName", "status", "category", "createdAt"] as const;
export type TicketSortColumn = (typeof ticketSortColumns)[number];

export const ticketStatusFilterValues = [
  TicketStatus.open,
  TicketStatus.resolved,
  TicketStatus.closed,
] as const;

export const ticketCategoryFilterValues = [
  TicketCategory.GENERAL_QUESTION,
  TicketCategory.TECHNICAL_QUESTION,
  TicketCategory.REFUND_REQUEST,
  "NONE",
] as const;

export const ticketsQuerySchema = z.object({
  sortBy: z.enum(ticketSortColumns, { error: "Invalid sortBy value" }).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"], { error: "Invalid sortOrder value" }).default("desc"),
  status: z.enum(ticketStatusFilterValues, { error: "Invalid status value" }).optional(),
  category: z.enum(ticketCategoryFilterValues, { error: "Invalid category value" }).optional(),
  search: z.string().trim().min(1, { error: "Search must not be empty" }).optional(),
});
