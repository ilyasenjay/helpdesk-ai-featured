import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TicketMessageCard } from "./TicketMessageCard";
import type { TicketDetail } from "../../lib/tickets";
import { TicketStatus } from "../../lib/ticket-status";

function makeTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 42,
    subject: "Can't log in",
    senderName: "Jane Customer",
    customerEmail: "jane@example.com",
    status: TicketStatus.open,
    category: null,
    assignedTo: null,
    createdAt: "2026-01-01T09:30:00.000Z",
    updatedAt: "2026-01-01T09:30:00.000Z",
    body: "I can't log in to my account.",
    aiSummary: null,
    messages: [],
    ...overrides,
  };
}

describe("TicketMessageCard", () => {
  it("renders the sender name", () => {
    render(<TicketMessageCard ticket={makeTicket({ senderName: "Jane Customer" })} />);
    expect(screen.getByText("Jane Customer")).toBeInTheDocument();
  });

  it("renders initials from the sender name", () => {
    render(<TicketMessageCard ticket={makeTicket({ senderName: "Jane Customer" })} />);
    expect(screen.getByText("JC")).toBeInTheDocument();
  });

  it("renders the customer email when present", () => {
    render(<TicketMessageCard ticket={makeTicket({ customerEmail: "jane@example.com" })} />);
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("does not render an email block when customerEmail is null", () => {
    render(<TicketMessageCard ticket={makeTicket({ customerEmail: null })} />);
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it("renders the ticket body", () => {
    render(<TicketMessageCard ticket={makeTicket({ body: "Please help me reset it." })} />);
    expect(screen.getByText("Please help me reset it.")).toBeInTheDocument();
  });

  it("renders the formatted created date", () => {
    render(<TicketMessageCard ticket={makeTicket({ createdAt: "2026-01-01T09:30:00.000Z" })} />);
    const expected = new Date("2026-01-01T09:30:00.000Z").toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
