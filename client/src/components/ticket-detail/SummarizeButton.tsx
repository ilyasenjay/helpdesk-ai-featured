import { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NotepadText } from "lucide-react";
import { Button } from "../ui/button";
import { FormRootError } from "../FormRootError";
import { getErrorMessage } from "../../lib/errors";
import type { TicketDetail } from "../../lib/tickets";

interface Props {
  ticket: TicketDetail;
}

async function summarizeTicket(ticketId: string): Promise<string> {
  const res = await axios.post<{ aiSummary: string }>(
    `/api/tickets/${ticketId}/summarize`,
    {},
    { withCredentials: true },
  );
  return res.data.aiSummary;
}

export function SummarizeButton({ ticket }: Props) {
  const queryClient = useQueryClient();
  const [summarizeError, setSummarizeError] = useState<string>();
  const ticketId = ticket.id.toString();

  const summarizeMutation = useMutation({
    mutationFn: () => summarizeTicket(ticketId),
    onSuccess: (aiSummary) => {
      setSummarizeError(undefined);
      queryClient.setQueryData<TicketDetail>(["ticket", ticketId], (old) =>
        old ? { ...old, aiSummary } : old,
      );
    },
    onError: (err) => {
      setSummarizeError(getErrorMessage(err));
    },
  });

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => summarizeMutation.mutate()}
        disabled={summarizeMutation.isPending}
      >
        <NotepadText />
        {summarizeMutation.isPending
          ? "Summarizing…"
          : ticket.aiSummary
            ? "Regenerate Summary"
            : "Summarize"}
      </Button>
      <FormRootError message={summarizeError} />
    </div>
  );
}
