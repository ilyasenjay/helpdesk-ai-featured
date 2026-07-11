import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageBubble } from "./MessageBubble";
import { MessageSender } from "../../lib/tickets";
import type { Message } from "../../lib/tickets";

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

describe("MessageBubble", () => {
  it("renders the message body", () => {
    render(<MessageBubble message={makeMessage({ body: "Hello there" })} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("labels a customer message as Customer", () => {
    render(<MessageBubble message={makeMessage({ sender: MessageSender.customer })} />);
    expect(screen.getByText("Customer")).toBeInTheDocument();
  });

  it("labels an agent message as Agent", () => {
    render(<MessageBubble message={makeMessage({ sender: MessageSender.agent })} />);
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("labels an AI message as AI", () => {
    render(<MessageBubble message={makeMessage({ sender: MessageSender.ai })} />);
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("renders the formatted timestamp", () => {
    render(<MessageBubble message={makeMessage({ createdAt: "2026-01-01T09:30:00.000Z" })} />);
    const expected = new Date("2026-01-01T09:30:00.000Z").toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
