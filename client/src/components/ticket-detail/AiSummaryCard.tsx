import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { sanitizeText } from "../../lib/sanitize";

interface Props {
  summary: string;
}

export function AiSummaryCard({ summary }: Props) {
  return (
    <Card className="bg-ai/5 ring-ai/25">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-ai-foreground" />
          <CardTitle>AI Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{sanitizeText(summary)}</p>
      </CardContent>
    </Card>
  );
}
