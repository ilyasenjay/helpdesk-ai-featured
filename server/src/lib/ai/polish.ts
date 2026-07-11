export function formatPolishedReply(params: {
  polishedText: string;
  customerName: string;
  agentName: string;
  agentEmail: string;
}): string {
  const greeting = `Hi ${params.customerName},`;
  const signature = `Best regards,\n${params.agentName}\n${params.agentEmail}`;
  return `${greeting}\n\n${params.polishedText.trim()}\n\n${signature}`;
}
