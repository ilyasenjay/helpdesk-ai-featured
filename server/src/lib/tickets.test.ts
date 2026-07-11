import { describe, expect, test } from "bun:test";
import { updateTicketSchema } from "./tickets";

describe("updateTicketSchema — assignedToId", () => {
  test("accepts a non-empty string id", () => {
    const result = updateTicketSchema.safeParse({ assignedToId: "user_123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignedToId).toBe("user_123");
    }
  });

  test("accepts null to unassign", () => {
    const result = updateTicketSchema.safeParse({ assignedToId: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignedToId).toBeNull();
    }
  });

  test("accepts being omitted entirely", () => {
    const result = updateTicketSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignedToId).toBeUndefined();
    }
  });

  test("rejects an empty string", () => {
    const result = updateTicketSchema.safeParse({ assignedToId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Invalid assignedToId");
    }
  });

  test("rejects a non-string value", () => {
    const result = updateTicketSchema.safeParse({ assignedToId: 123 });
    expect(result.success).toBe(false);
  });
});

describe("updateTicketSchema — status and category", () => {
  test("accepts a valid status", () => {
    const result = updateTicketSchema.safeParse({ status: "resolved" });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid status", () => {
    const result = updateTicketSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(false);
  });

  test("rejects the AI-internal new/processing statuses — agents can't set them manually", () => {
    expect(updateTicketSchema.safeParse({ status: "new" }).success).toBe(false);
    expect(updateTicketSchema.safeParse({ status: "processing" }).success).toBe(false);
  });

  test("accepts a valid category", () => {
    const result = updateTicketSchema.safeParse({ category: "REFUND_REQUEST" });
    expect(result.success).toBe(true);
  });

  test("accepts null category", () => {
    const result = updateTicketSchema.safeParse({ category: null });
    expect(result.success).toBe(true);
  });

  test("rejects an invalid category", () => {
    const result = updateTicketSchema.safeParse({ category: "BILLING" });
    expect(result.success).toBe(false);
  });

  test("accepts status, category, and assignedToId together", () => {
    const result = updateTicketSchema.safeParse({
      status: "closed",
      category: "TECHNICAL_QUESTION",
      assignedToId: "user_123",
    });
    expect(result.success).toBe(true);
  });
});
