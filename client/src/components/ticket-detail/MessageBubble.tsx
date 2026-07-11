import { Sparkles } from "lucide-react";
import { formatDateTime } from "../../lib/format";
import { sanitizeText } from "../../lib/sanitize";
import { MessageSender } from "../../lib/tickets";
import type { Message } from "../../lib/tickets";

const senderLabels: Record<MessageSender, string> = {
  [MessageSender.customer]: "Customer",
  [MessageSender.agent]: "Agent",
  [MessageSender.ai]: "AI",
};

export function MessageBubble({ message }: { message: Message }) {
  const isAgent = message.sender === MessageSender.agent;
  const isAi = message.sender === MessageSender.ai;

  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"}`} data-testid="message-bubble">
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
        <p className="whitespace-pre-wrap leading-relaxed">{sanitizeText(message.body)}</p>
      </div>
    </div>
  );
}
