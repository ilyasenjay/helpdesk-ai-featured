import { formatDateTime } from "../../lib/format";
import { sanitizeText } from "../../lib/sanitize";
import { MessageSender } from "../../lib/tickets";
import type { Message } from "../../lib/tickets";
import { AiStamp } from "../AiStamp";

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
              ? "bg-ai/10 ring-1 ring-ai/30"
              : "bg-muted"
        }`}
      >
        <div className="mb-1.5 flex items-center gap-1.5 text-xs opacity-70">
          {isAi ? (
            <AiStamp>{senderLabels[message.sender]}</AiStamp>
          ) : (
            <span>{senderLabels[message.sender]}</span>
          )}
          <span>·</span>
          <span>{formatDateTime(message.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap leading-relaxed">{sanitizeText(message.body)}</p>
      </div>
    </div>
  );
}
