import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import type { DailyTicketCount } from "../lib/dashboard";

const chartConfig = {
  count: {
    label: "Tickets",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

function formatTick(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface TicketsPerDayChartProps {
  data: DailyTicketCount[] | undefined;
  isLoading: boolean;
}

export default function TicketsPerDayChart({ data, isLoading }: TicketsPerDayChartProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">
          Tickets over the past 30 days
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatTick}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelFormatter={(value) => formatTick(String(value))} />}
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
