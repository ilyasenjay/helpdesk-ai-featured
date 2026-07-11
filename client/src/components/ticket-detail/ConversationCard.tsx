import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ReplyForm } from "../ReplyForm";
import { MessageBubble } from "./MessageBubble";
import type { TicketDetail } from "../../lib/tickets";

interface Props {
  ticket: TicketDetail;
}

export function ConversationCard({ ticket }: Props) {
  return (
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
        <ReplyForm ticket={ticket} />
      </CardContent>
    </Card>
  );
}
