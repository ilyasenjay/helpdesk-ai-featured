import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TicketDetailsPanel } from "./TicketDetailsPanel";
import type { TicketAssignee, TicketDetail } from "../../lib/tickets";
import { TicketStatus } from "../../lib/ticket-status";
import { TicketCategory } from "../../lib/ticket-category";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

const TICKET_ID = "42";

const agents: TicketAssignee[] = [
  { id: "agent-1", name: "Alice Agent", email: "alice@example.com" },
  { id: "agent-2", name: "Bob Agent", email: "bob@example.com" },
];

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
    updatedAt: "2026-01-02T10:00:00.000Z",
    body: "I can't log in to my account.",
    aiSummary: null,
    messages: [],
    ...overrides,
  };
}

function renderPanel(ticket: TicketDetail, agentList: TicketAssignee[] | undefined = agents) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData<TicketDetail>(["ticket", TICKET_ID], ticket);
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <TicketDetailsPanel ticket={ticket} agents={agentList} />
    </QueryClientProvider>
  );
  return { queryClient, ...rendered };
}

function comboboxes() {
  return screen.getAllByRole("combobox");
}

describe("TicketDetailsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("read-only rendering", () => {
    it("shows Unassigned when there is no assignee", () => {
      renderPanel(makeTicket({ assignedTo: null }));
      expect(comboboxes()[0]).toHaveTextContent("Unassigned");
    });

    it("shows the assigned agent's name", () => {
      renderPanel(makeTicket({ assignedTo: agents[0] }));
      expect(comboboxes()[0]).toHaveTextContent("Alice Agent");
    });

    it("shows the current status label", () => {
      renderPanel(makeTicket({ status: TicketStatus.resolved }));
      expect(comboboxes()[1]).toHaveTextContent("Resolved");
    });

    it("shows Uncategorized when there is no category", () => {
      renderPanel(makeTicket({ category: null }));
      expect(comboboxes()[2]).toHaveTextContent("Uncategorized");
    });

    it("shows the current category label", () => {
      renderPanel(makeTicket({ category: TicketCategory.refundRequest }));
      expect(comboboxes()[2]).toHaveTextContent("Refund Request");
    });

    it("renders the formatted created and updated timestamps", () => {
      renderPanel(
        makeTicket({
          createdAt: "2026-01-01T09:30:00.000Z",
          updatedAt: "2026-01-02T10:00:00.000Z",
        })
      );
      const created = new Date("2026-01-01T09:30:00.000Z").toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const updated = new Date("2026-01-02T10:00:00.000Z").toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      expect(screen.getByText(created)).toBeInTheDocument();
      expect(screen.getByText(updated)).toBeInTheDocument();
    });
  });

  describe("updating status", () => {
    it("PATCHes the new status with credentials", async () => {
      const ticket = makeTicket({ status: TicketStatus.open });
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ticket: { ...ticket, status: TicketStatus.resolved } } });
      renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[1]);
      await user.click(await screen.findByRole("option", { name: "Resolved" }));

      await waitFor(() =>
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          "/api/tickets/42",
          { status: TicketStatus.resolved },
          { withCredentials: true }
        )
      );
    });

    it("updates the cached ticket on success", async () => {
      const ticket = makeTicket({ status: TicketStatus.open });
      const updated = { ...ticket, status: TicketStatus.resolved };
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ticket: updated } });
      const { queryClient } = renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[1]);
      await user.click(await screen.findByRole("option", { name: "Resolved" }));

      await waitFor(() => {
        const cached = queryClient.getQueryData<TicketDetail>(["ticket", TICKET_ID]);
        expect(cached?.status).toBe(TicketStatus.resolved);
      });
    });

    it("invalidates the tickets list query on success", async () => {
      const ticket = makeTicket({ status: TicketStatus.open });
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ticket: { ...ticket, status: TicketStatus.resolved } } });
      const { queryClient } = renderPanel(ticket);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      const user = userEvent.setup();
      await user.click(comboboxes()[1]);
      await user.click(await screen.findByRole("option", { name: "Resolved" }));

      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tickets"] })
      );
    });
  });

  describe("updating assignee", () => {
    it("PATCHes the selected agent's id", async () => {
      const ticket = makeTicket({ assignedTo: null });
      mockedAxios.patch = vi
        .fn()
        .mockResolvedValue({ data: { ticket: { ...ticket, assignedTo: agents[1] } } });
      renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[0]);
      await user.click(await screen.findByRole("option", { name: "Bob Agent" }));

      await waitFor(() =>
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          "/api/tickets/42",
          { assignedToId: "agent-2" },
          { withCredentials: true }
        )
      );
    });

    it("PATCHes null when reassigning to Unassigned", async () => {
      const ticket = makeTicket({ assignedTo: agents[0] });
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ticket: { ...ticket, assignedTo: null } } });
      renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[0]);
      await user.click(await screen.findByRole("option", { name: "Unassigned" }));

      await waitFor(() =>
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          "/api/tickets/42",
          { assignedToId: null },
          { withCredentials: true }
        )
      );
    });
  });

  describe("updating category", () => {
    it("PATCHes the selected category", async () => {
      const ticket = makeTicket({ category: null });
      mockedAxios.patch = vi
        .fn()
        .mockResolvedValue({ data: { ticket: { ...ticket, category: TicketCategory.technicalQuestion } } });
      renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[2]);
      await user.click(await screen.findByRole("option", { name: "Technical Question" }));

      await waitFor(() =>
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          "/api/tickets/42",
          { category: TicketCategory.technicalQuestion },
          { withCredentials: true }
        )
      );
    });

    it("PATCHes null when set back to Uncategorized", async () => {
      const ticket = makeTicket({ category: TicketCategory.generalQuestion });
      mockedAxios.patch = vi.fn().mockResolvedValue({ data: { ticket: { ...ticket, category: null } } });
      renderPanel(ticket);

      const user = userEvent.setup();
      await user.click(comboboxes()[2]);
      await user.click(await screen.findByRole("option", { name: "Uncategorized" }));

      await waitFor(() =>
        expect(mockedAxios.patch).toHaveBeenCalledWith(
          "/api/tickets/42",
          { category: null },
          { withCredentials: true }
        )
      );
    });
  });
});
