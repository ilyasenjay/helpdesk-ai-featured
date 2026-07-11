import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TicketDetailPage from "./TicketDetailPage";
import { MessageSender } from "../lib/tickets";
import type { TicketAssignee, TicketDetail } from "../lib/tickets";
import { TicketStatus } from "../lib/ticket-status";
import { TicketCategory } from "../lib/ticket-category";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

function makeTicket(overrides: Partial<TicketDetail> = {}): TicketDetail {
  return {
    id: 42,
    subject: "Can't log in",
    senderName: "Jane Customer",
    customerEmail: "jane@example.com",
    status: TicketStatus.open,
    category: TicketCategory.technicalQuestion,
    assignedTo: null,
    createdAt: "2026-01-01T09:30:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
    body: "I can't log in to my account.",
    aiSummary: null,
    messages: [
      {
        id: "msg-1",
        body: "I can't log in to my account.",
        sender: MessageSender.customer,
        ticketId: 42,
        userId: null,
        createdAt: "2026-01-01T09:30:00.000Z",
      },
    ],
    ...overrides,
  };
}

function mockTicketEndpoint(ticket: TicketDetail, agents: TicketAssignee[] = []) {
  mockedAxios.get = vi.fn(async (url: string) => {
    if (url === "/api/users/agents") {
      return { data: { agents } };
    }
    if (url === `/api/tickets/${ticket.id}`) {
      return { data: { ticket } };
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as any;
}

function renderPage(id = "42") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${id}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("TicketDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the skeleton while loading", () => {
    mockedAxios.get = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = renderPage();
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders the ticket number and subject once loaded", async () => {
    mockTicketEndpoint(makeTicket({ id: 42, subject: "Can't log in" }));
    renderPage("42");
    await waitFor(() => {
      expect(screen.getByText("Ticket #42")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Can't log in" })).toBeInTheDocument();
    });
  });

  it("renders the status badge", async () => {
    mockTicketEndpoint(makeTicket({ status: TicketStatus.resolved }));
    renderPage();
    await waitFor(() => {
      // "Resolved" appears twice: the header badge and the details panel's status select
      expect(screen.getAllByText("Resolved")).toHaveLength(2);
    });
  });

  it("renders the original message card", async () => {
    mockTicketEndpoint(
      makeTicket({
        senderName: "Jane Customer",
        body: "I can't log in to my account.",
        messages: [],
      })
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Jane Customer")).toBeInTheDocument();
      expect(screen.getByText("I can't log in to my account.")).toBeInTheDocument();
    });
  });

  it("renders the conversation thread", async () => {
    mockTicketEndpoint(
      makeTicket({
        messages: [
          {
            id: "msg-1",
            body: "Customer message",
            sender: MessageSender.customer,
            ticketId: 42,
            userId: null,
            createdAt: "2026-01-01T09:30:00.000Z",
          },
          {
            id: "msg-2",
            body: "Agent reply",
            sender: MessageSender.agent,
            ticketId: 42,
            userId: "agent-1",
            createdAt: "2026-01-01T10:00:00.000Z",
          },
        ],
      })
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Customer message")).toBeInTheDocument();
      expect(screen.getByText("Agent reply")).toBeInTheDocument();
    });
  });

  it("renders the AI summary card only when a summary exists", async () => {
    mockTicketEndpoint(makeTicket({ aiSummary: "Customer is locked out of their account." }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("AI Summary")).toBeInTheDocument();
      expect(screen.getByText("Customer is locked out of their account.")).toBeInTheDocument();
    });
  });

  it("does not render the AI summary card when there is no summary", async () => {
    mockTicketEndpoint(makeTicket({ aiSummary: null }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Can't log in")).toBeInTheDocument();
    });
    expect(screen.queryByText("AI Summary")).not.toBeInTheDocument();
  });

  it("renders the details panel with the ticket's current category", async () => {
    mockTicketEndpoint(makeTicket({ category: TicketCategory.refundRequest }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Details")).toBeInTheDocument();
      expect(screen.getByText("Refund Request")).toBeInTheDocument();
    });
  });

  it("renders a Back to tickets link", async () => {
    mockTicketEndpoint(makeTicket());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /back to tickets/i })).toHaveAttribute(
        "href",
        "/tickets"
      );
    });
  });

  it("shows a not-found message on a 404 response", async () => {
    const err = Object.assign(new Error("Not Found"), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockedAxios.get = vi.fn().mockRejectedValue(err);
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(true) as any;
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Ticket not found.")).toBeInTheDocument();
    });
  });

  it("shows a generic failure message on other errors", async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error("Network Error"));
    mockedAxios.isAxiosError = vi.fn().mockReturnValue(false) as any;
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Failed to load ticket.")).toBeInTheDocument();
    });
  });
});
