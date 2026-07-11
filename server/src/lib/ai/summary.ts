import { MessageSender } from "../../generated/prisma/client";

function labelForSender(sender: MessageSender, customerName: string): string {
  switch (sender) {
    case MessageSender.CUSTOMER:
      return customerName;
    case MessageSender.AGENT:
      return "Agent";
    case MessageSender.AI:
      return "AI";
  }
}

export function buildTicketSummaryPrompt(params: {
  subject: string;
  customerName: string;
  body: string;
  messages: { sender: MessageSender; body: string }[];
}): string {
  const transcript = [
    `${params.customerName}: ${params.body}`,
    ...params.messages.map((m) => `${labelForSender(m.sender, params.customerName)}: ${m.body}`),
  ].join("\n\n");

  return `Ticket subject: ${params.subject}\n\nFull conversation so far:\n${transcript}`;
}
