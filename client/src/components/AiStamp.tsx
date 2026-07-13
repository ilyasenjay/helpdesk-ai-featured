import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";

interface AiStampProps {
  children: React.ReactNode;
  className?: string;
}

export function AiStamp({ children, className }: AiStampProps) {
  return (
    <span
      className={cn(
        "inline-flex -rotate-2 items-center gap-1 rounded-full border-[1.5px] border-ai/70 bg-ai/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-ai-foreground uppercase",
        className,
      )}
    >
      <Sparkles size={10} strokeWidth={2.5} />
      {children}
    </span>
  );
}
