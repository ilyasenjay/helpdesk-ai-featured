import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReplyForm } from "./ReplyForm";
import { MessageSender } from "../lib/tickets";
import type { Message, TicketDetail } from "../lib/tickets";
import { TicketStatus } from "../lib/ticket-status";

vi.mock("axios");
const mockedAxios = vi.mocked(axios);

const TICKET_ID = "42";

const seedTicket: TicketDetail = {
  id: 42,
  subject: "Can't log in",
  senderName: "Jane Customer",
  customerEmail: "jane@example.com",
  status: TicketStatus.open,
  category: null,
  assignedTo: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  body: "I can't log in to my account.",
  aiSummary: null,
  messages: [
    {
      id: "msg-1",
      body: "I can't log in to my account.",
      sender: MessageSender.customer,
      ticketId: 42,
      userId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData<TicketDetail>(["ticket", TICKET_ID], seedTicket);
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ReplyForm ticket={seedTicket} />
    </QueryClientProvider>
  );
  return { queryClient, ...rendered };
}

async function fillAndSubmit(body: string) {
  const user = userEvent.setup();
  const textarea = screen.getByLabelText("Reply");
  if (body) await user.type(textarea, body);
  await user.click(screen.getByRole("button", { name: /send reply/i }));
}

describe("ReplyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the reply textarea and submit button", () => {
    renderForm();
    expect(screen.getByLabelText("Reply")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reply" })).toBeInTheDocument();
  });

  describe("validation", () => {
    it("shows an error when the reply body is empty", async () => {
      renderForm();
      await fillAndSubmit("");
      await waitFor(() =>
        expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument()
      );
    });

    it("does not call POST when validation fails", async () => {
      mockedAxios.post = vi.fn() as any;
      renderForm();
      await fillAndSubmit("");
      await waitFor(() =>
        expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument()
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe("successful submission", () => {
    const newMessage: Message = {
      id: "msg-2",
      body: "Thanks for reaching out, let's take a look.",
      sender: MessageSender.agent,
      ticketId: 42,
      userId: "agent-1",
      createdAt: "2026-01-02T00:00:00.000Z",
    };

    it("POSTs to /api/tickets/:id/messages with credentials", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { message: newMessage } });
      renderForm();
      await fillAndSubmit(newMessage.body);
      await waitFor(() =>
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "/api/tickets/42/messages",
          { body: newMessage.body },
          { withCredentials: true }
        )
      );
    });

    it("clears the textarea after a successful submission", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { message: newMessage } });
      renderForm();
      await fillAndSubmit(newMessage.body);
      await waitFor(() =>
        expect(screen.getByLabelText("Reply")).toHaveValue("")
      );
    });

    it("appends the new message to the ticket's cached message list", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({ data: { message: newMessage } });
      const { queryClient } = renderForm();
      await fillAndSubmit(newMessage.body);
      await waitFor(() => {
        const cached = queryClient.getQueryData<TicketDetail>(["ticket", TICKET_ID]);
        expect(cached?.messages).toHaveLength(2);
        expect(cached?.messages[1]).toEqual(newMessage);
      });
    });
  });

  describe("failed submission", () => {
    it("shows the server error message from the response body", async () => {
      const err = Object.assign(new Error("Bad Request"), {
        isAxiosError: true,
        response: { data: { message: "Ticket not found" } },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true) as any;
      renderForm();
      await fillAndSubmit("Following up on this.");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent("Ticket not found")
      );
    });

    it("shows a generic message for non-axios errors", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false) as any;
      renderForm();
      await fillAndSubmit("Following up on this.");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent("Something went wrong")
      );
    });

    it("does not clear the textarea when submission fails", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false) as any;
      renderForm();
      await fillAndSubmit("Following up on this.");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toBeInTheDocument()
      );
      expect(screen.getByLabelText("Reply")).toHaveValue("Following up on this.");
    });

    it("does not modify the cached message list when submission fails", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false) as any;
      const { queryClient } = renderForm();
      await fillAndSubmit("Following up on this.");
      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toBeInTheDocument()
      );
      const cached = queryClient.getQueryData<TicketDetail>(["ticket", TICKET_ID]);
      expect(cached?.messages).toHaveLength(1);
    });
  });

  describe("polish", () => {
    it("shows a validation error and does not call POST when the draft is empty", async () => {
      mockedAxios.post = vi.fn();
      renderForm();
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: /polish/i }));
      await waitFor(() =>
        expect(screen.getByText("Reply cannot be empty")).toBeInTheDocument()
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("POSTs the draft to /api/tickets/:id/polish and replaces the textarea with the result", async () => {
      mockedAxios.post = vi.fn().mockResolvedValue({
        data: { body: "Thank you for reaching out — we're looking into this now." },
      });
      renderForm();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Reply"), "thnks we look into it");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(mockedAxios.post).toHaveBeenCalledWith(
          "/api/tickets/42/polish",
          { body: "thnks we look into it" },
          { withCredentials: true }
        )
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Reply")).toHaveValue(
          "Thank you for reaching out — we're looking into this now."
        )
      );
    });

    it("surfaces a subscription/billing error message when the AI provider rejects the request", async () => {
      const err = Object.assign(new Error("Bad Gateway"), {
        isAxiosError: true,
        response: {
          data: {
            code: "ai_auth_failed",
            message:
              "The Claude API key was rejected. It may be invalid, revoked, or the account behind it no longer has an active subscription — check the Anthropic Console.",
          },
        },
      });
      mockedAxios.post = vi.fn().mockRejectedValue(err);
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true) as any;
      renderForm();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Reply"), "Thanks for your patience.");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent(/no longer has an active subscription/i)
      );
      expect(screen.getByLabelText("Reply")).toHaveValue("Thanks for your patience.");
    });

    it("does not clear an existing root error's draft when polish fails", async () => {
      mockedAxios.post = vi.fn().mockRejectedValue(new Error("Network Error"));
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(false) as any;
      renderForm();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Reply"), "Draft reply text");
      await user.click(screen.getByRole("button", { name: /polish/i }));

      await waitFor(() =>
        expect(screen.getByTestId("form-root-error")).toHaveTextContent("Something went wrong")
      );
      expect(screen.getByLabelText("Reply")).toHaveValue("Draft reply text");
    });
  });
});
