import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { categoryLabels } from "../TicketsTable";
import { TicketStatus, statusLabels } from "../../lib/ticket-status";
import { TicketCategory } from "../../lib/ticket-category";
import { formatDateTime } from "../../lib/format";
import type { TicketAssignee, TicketDetail } from "../../lib/tickets";

const UNASSIGNED = "UNASSIGNED" as const;
type AssigneeValue = string | typeof UNASSIGNED;

type CategoryValue = TicketCategory | "NONE";

const categoryValueLabels: Record<CategoryValue, string> = {
  NONE: "Uncategorized",
  ...categoryLabels,
};

interface UpdateTicketInput {
  status?: TicketStatus;
  category?: TicketCategory | null;
  assignedToId?: string | null;
}

async function updateTicket(id: string, input: UpdateTicketInput): Promise<TicketDetail> {
  const res = await axios.patch<{ ticket: TicketDetail }>(`/api/tickets/${id}`, input, {
    withCredentials: true,
  });
  return res.data.ticket;
}

interface Props {
  ticket: TicketDetail;
  agents?: TicketAssignee[];
}

export function TicketDetailsPanel({ ticket, agents }: Props) {
  const queryClient = useQueryClient();
  const id = ticket.id.toString();
  const isAiProcessing =
    ticket.status === TicketStatus.new || ticket.status === TicketStatus.processing;

  const updateMutation = useMutation({
    mutationFn: (input: UpdateTicketInput) => updateTicket(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<TicketDetail>(["ticket", id], (old) =>
        old ? { ...old, ...updated } : old,
      );
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="field-label">Assigned to</label>
          <Select<AssigneeValue>
            value={ticket.assignedTo?.id ?? UNASSIGNED}
            onValueChange={(value) =>
              updateMutation.mutate({
                assignedToId: value === UNASSIGNED ? null : (value ?? null),
              })
            }
          >
            <SelectTrigger className="w-full" size="sm" data-testid="assigned-to-select">
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

        <div>
          <label className="field-label">Status</label>
          {isAiProcessing ? (
            <p className="text-sm text-muted-foreground">AI is trying to resolve this ticket…</p>
          ) : (
            <Select<TicketStatus>
              value={ticket.status}
              onValueChange={(value) => value && updateMutation.mutate({ status: value })}
            >
              <SelectTrigger className="w-full" size="sm" data-testid="status-select">
                <SelectValue placeholder="Status">
                  {(value: TicketStatus) => statusLabels[value]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TicketStatus.open}>Open</SelectItem>
                <SelectItem value={TicketStatus.resolved}>Resolved</SelectItem>
                <SelectItem value={TicketStatus.closed}>Closed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className="field-label">Category</label>
          <Select<CategoryValue>
            value={ticket.category ?? "NONE"}
            onValueChange={(value) =>
              updateMutation.mutate({ category: value === "NONE" ? null : (value ?? null) })
            }
          >
            <SelectTrigger className="w-full" size="sm" data-testid="category-select">
              <SelectValue placeholder="Category">
                {(value: CategoryValue) => categoryValueLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketCategory.generalQuestion}>
                {categoryLabels[TicketCategory.generalQuestion]}
              </SelectItem>
              <SelectItem value={TicketCategory.technicalQuestion}>
                {categoryLabels[TicketCategory.technicalQuestion]}
              </SelectItem>
              <SelectItem value={TicketCategory.refundRequest}>
                {categoryLabels[TicketCategory.refundRequest]}
              </SelectItem>
              <SelectItem value="NONE">Uncategorized</SelectItem>
            </SelectContent>
          </Select>
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
  );
}
