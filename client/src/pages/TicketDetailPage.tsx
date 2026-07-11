import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "../components/TicketsTable";
import { TicketMessageCard } from "../components/ticket-detail/TicketMessageCard";
import { AiSummaryCard } from "../components/ticket-detail/AiSummaryCard";
import { ConversationCard } from "../components/ticket-detail/ConversationCard";
import { TicketDetailsPanel } from "../components/ticket-detail/TicketDetailsPanel";
import { TicketDetailSkeleton } from "../components/ticket-detail/TicketDetailSkeleton";
import { sanitizeText } from "../lib/sanitize";
import type { TicketAssignee, TicketDetail } from "../lib/tickets";

async function fetchTicket(id: string): Promise<TicketDetail> {
  const res = await axios.get<{ ticket: TicketDetail }>(`/api/tickets/${id}`, {
    withCredentials: true,
  });
  return res.data.ticket;
}

async function fetchAgents(): Promise<TicketAssignee[]> {
  const res = await axios.get<{ agents: TicketAssignee[] }>("/api/users/agents", {
    withCredentials: true,
  });
  return res.data.agents;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  if (isLoading) {
    return <TicketDetailSkeleton />;
  }

  if (error || !ticket) {
    const notFound = axios.isAxiosError(error) && error.response?.status === 404;
    return (
      <div className="mx-auto max-w-5xl">
        <BackLink />
        <p className="mt-4 text-sm text-destructive">
          {notFound ? "Ticket not found." : "Failed to load ticket."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Ticket #{ticket.id}</div>
          <h1 className="text-2xl font-semibold">{sanitizeText(ticket.subject)}</h1>
        </div>
        <span data-testid="ticket-status-badge">
          <StatusBadge status={ticket.status} />
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <div className="space-y-6">
          <TicketMessageCard ticket={ticket} />
          {ticket.aiSummary && <AiSummaryCard summary={ticket.aiSummary} />}
          <ConversationCard ticket={ticket} />
        </div>

        <div className="space-y-6">
          <TicketDetailsPanel ticket={ticket} agents={agents} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/tickets"
      className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft size={16} /> Back to tickets
    </Link>
  );
}
