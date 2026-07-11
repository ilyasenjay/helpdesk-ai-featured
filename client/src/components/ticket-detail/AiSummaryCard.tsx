import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface Props {
  summary: string;
}

export function AiSummaryCard({ summary }: Props) {
  return (
    <Card className="bg-accent/50 ring-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <CardTitle>AI Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}
