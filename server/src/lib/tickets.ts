import { z } from "zod";

export const inboundEmailSchema = z.object({
  from: z.email({ error: "Invalid email address" }),
  fromName: z.string().trim().min(1, { error: "Sender name is required" }),
  subject: z.string().trim().min(1, { error: "Subject is required" }),
  body: z.string().min(1, { error: "Body is required" }),
  bodyHtml: z.string().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
