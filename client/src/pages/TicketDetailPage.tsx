import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { StatusBadge, categoryLabels, statusBadgeStyles } from "../components/TicketsTable";
import { TicketStatus, statusLabels } from "../lib/ticket-status";
import { MessageSender } from "../lib/tickets";
import type { Message, TicketAssignee, TicketDetail } from "../lib/tickets";

const UNASSIGNED = "UNASSIGNED" as const;
type AssigneeValue = string | typeof UNASSIGNED;

const senderLabels: Record<MessageSender, string> = {
  [MessageSender.customer]: "Customer",
  [MessageSender.agent]: "Agent",
  [MessageSender.ai]: "AI",
};

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

async function assignTicket(id: string, assignedToId: string | null): Promise<TicketDetail> {
  const res = await axios.patch<{ ticket: TicketDetail }>(
    `/api/tickets/${id}`,
    { assignedToId },
    { withCredentials: true },
  );
  return res.data.ticket;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => fetchTicket(id!),
    enabled: !!id,
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  const assignMutation = useMutation({
    mutationFn: (assignedToId: string | null) => assignTicket(id!, assignedToId),
    onSuccess: (updated) => {
      queryClient.setQueryData<TicketDetail>(["ticket", id], (old) =>
        old ? { ...old, ...updated } : old,
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
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
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {initials(ticket.senderName)}
                </div>
                <div className="min-w-0">
                  <CardTitle>{ticket.senderName}</CardTitle>
                  {ticket.customerEmail && (
                    <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail size={12} className="shrink-0" />
                      {ticket.customerEmail}
                    </div>
                  )}
                </div>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(ticket.createdAt)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{ticket.body}</p>
            </CardContent>
          </Card>

          {ticket.aiSummary && (
            <Card className="bg-accent/50 ring-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <CardTitle>AI Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{ticket.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replies yet.</p>
              ) : (
                <div className="space-y-4">
                  {ticket.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Assigned to
                </label>
                <Select<AssigneeValue>
                  value={ticket.assignedTo?.id ?? UNASSIGNED}
                  onValueChange={(value) =>
                    assignMutation.mutate(value === UNASSIGNED ? null : (value ?? null))
                  }
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue placeholder="Assigned to">
                      {(value: AssigneeValue) =>
                        value === UNASSIGNED
                          ? "Unassigned"
                          : (agents?.find((agent) => agent.id === value)?.name ?? "Unassigned")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{statusLabels[ticket.status]}</span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">
                  {ticket.category ? categoryLabels[ticket.category] : "Uncategorized"}
                </span>
              </div>

              <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Created</span>
                  <span>{formatDateTime(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Updated</span>
                  <span>{formatDateTime(ticket.updatedAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
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

function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.sender === MessageSender.agent;
  const isAi = message.sender === MessageSender.ai;

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isAgent
            ? "bg-primary text-primary-foreground"
            : isAi
              ? "bg-accent ring-1 ring-primary/20"
              : "bg-muted"
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
          {isAi && <Sparkles size={11} />}
          <span>{senderLabels[message.sender]}</span>
          <span>·</span>
          <span>{formatDateTime(message.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
}

function TicketDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse">
      <div className="mb-4 h-4 w-32 rounded bg-muted" />
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className={`h-6 w-16 rounded-full ${statusBadgeStyles[TicketStatus.open]}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-48 rounded-xl bg-muted" />
        </div>
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
