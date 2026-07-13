import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  isLoading: boolean;
}

export default function StatCard({ label, value, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="font-mono text-2xl font-semibold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
