import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketsTable, TicketsTableSkeleton } from "../components/TicketsTable";
import type { Ticket } from "../lib/tickets";

async function fetchTickets(): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>("/api/tickets", {
    withCredentials: true,
  });
  return res.data.tickets;
}

export default function TicketsPage() {
  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["tickets"],
    queryFn: fetchTickets,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tickets</h1>
      </div>

      {isLoading && <TicketsTableSkeleton />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && tickets?.length === 0 && (
        <p className="text-sm text-muted-foreground">No tickets found.</p>
      )}
      {tickets && tickets.length > 0 && <TicketsTable tickets={tickets} />}
    </div>
  );
}
