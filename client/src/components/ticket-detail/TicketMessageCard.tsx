import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { formatDateTime, initials } from "../../lib/format";
import { sanitizeText } from "../../lib/sanitize";
import type { TicketDetail } from "../../lib/tickets";

interface Props {
  ticket: TicketDetail;
}

export function TicketMessageCard({ ticket }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {initials(ticket.senderName)}
          </div>
          <div className="min-w-0">
            <CardTitle>{sanitizeText(ticket.senderName)}</CardTitle>
            {ticket.customerEmail && (
              <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <Mail size={12} className="shrink-0" />
                {sanitizeText(ticket.customerEmail)}
              </div>
            )}
          </div>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatDateTime(ticket.createdAt)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{sanitizeText(ticket.body)}</p>
      </CardContent>
    </Card>
  );
}
