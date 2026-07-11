import { z } from "zod";
import { TicketStatus, TicketCategory } from "../generated/prisma/client";

export const inboundEmailSchema = z.object({
  from: z
    .email({ error: "Invalid email address" })
    .max(255, { error: "Email must be at most 255 characters" }),
  fromName: z.string().trim().min(1, { error: "Sender name is required" }),
  subject: z
    .string()
    .trim()
    .min(1, { error: "Subject is required" })
    .max(255, { error: "Subject must be at most 255 characters" }),
  body: z
    .string()
    .min(1, { error: "Body is required" })
    .max(1000, { error: "Body must be at most 1000 characters" }),
  bodyHtml: z
    .string()
    .max(3000, { error: "Body HTML must be at most 3000 characters" })
    .optional(),
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

export const ticketPageSizes = [10, 20, 50, 100] as const;

export const updateTicketSchema = z.object({
  status: z.enum([TicketStatus.open, TicketStatus.resolved, TicketStatus.closed]).optional(),
  category: z
    .enum([
      TicketCategory.GENERAL_QUESTION,
      TicketCategory.TECHNICAL_QUESTION,
      TicketCategory.REFUND_REQUEST,
    ])
    .nullable()
    .optional(),
  assignedToId: z.string().min(1, { error: "Invalid assignedToId" }).nullable().optional(),
});

export const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Reply cannot be empty" })
    .max(1000, { error: "Reply must be at most 1000 characters" }),
  bodyHtml: z
    .string()
    .max(3000, { error: "Body HTML must be at most 3000 characters" })
    .optional(),
});

export const polishReplySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Reply cannot be empty" })
    .max(1000, { error: "Reply must be at most 1000 characters" }),
});

export const ticketsQuerySchema = z.object({
  sortBy: z.enum(ticketSortColumns, { error: "Invalid sortBy value" }).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"], { error: "Invalid sortOrder value" }).default("desc"),
  status: z.enum(ticketStatusFilterValues, { error: "Invalid status value" }).optional(),
  category: z.enum(ticketCategoryFilterValues, { error: "Invalid category value" }).optional(),
  search: z.string().trim().min(1, { error: "Search must not be empty" }).optional(),
  page: z.coerce.number().int().min(1, { error: "Invalid page value" }).default(1),
  pageSize: z.coerce
    .number()
    .refine((n) => (ticketPageSizes as readonly number[]).includes(n), {
      error: "Invalid pageSize value",
    })
    .default(10),
});
