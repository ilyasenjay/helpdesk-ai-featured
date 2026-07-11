import { screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConversationCard } from "./ConversationCard";
import { renderWithQuery } from "../../test/renderWithQuery";
import { MessageSender } from "../../lib/tickets";
import type { Message, TicketDetail } from "../../lib/tickets";
import { TicketStatus } from "../../lib/ticket-status";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    body: "I can't log in to my account.",
    sender: MessageSender.customer,
    ticketId: 42,
    userId: null,
    createdAt: "2026-01-01T09:30:00.000Z",
    ...overrides,
  };
}

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
    resolvedByAi: false,
    messages: [],
    ...overrides,
  };
}

describe("ConversationCard", () => {
  it("renders the heading", () => {
    renderWithQuery(<ConversationCard ticket={makeTicket()} />);
    expect(screen.getByText("Conversation")).toBeInTheDocument();
  });

  it("shows an empty state when there are no messages", () => {
    renderWithQuery(<ConversationCard ticket={makeTicket({ messages: [] })} />);
    expect(screen.getByText("No replies yet.")).toBeInTheDocument();
  });

  it("renders a bubble for every message in the thread", () => {
    const messages = [
      makeMessage({ id: "msg-1", body: "First message", sender: MessageSender.customer }),
      makeMessage({ id: "msg-2", body: "Second message", sender: MessageSender.agent }),
    ];
    renderWithQuery(<ConversationCard ticket={makeTicket({ messages })} />);
    expect(screen.getByText("First message")).toBeInTheDocument();
    expect(screen.getByText("Second message")).toBeInTheDocument();
  });

  it("does not show the empty state once messages exist", () => {
    renderWithQuery(
      <ConversationCard ticket={makeTicket({ messages: [makeMessage()] })} />
    );
    expect(screen.queryByText("No replies yet.")).not.toBeInTheDocument();
  });

  it("renders the reply form below the thread", () => {
    renderWithQuery(<ConversationCard ticket={makeTicket()} />);
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
  });
});
