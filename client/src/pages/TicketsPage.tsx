import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { TicketsTable, TicketsTableSkeleton } from "../components/TicketsTable";
import type { Ticket, TicketSortColumn } from "../lib/tickets";

function toSortParams(sorting: SortingState): { sortBy: TicketSortColumn; sortOrder: "asc" | "desc" } {
  const [sort] = sorting;
  return sort
    ? { sortBy: sort.id as TicketSortColumn, sortOrder: sort.desc ? "desc" : "asc" }
    : { sortBy: "createdAt", sortOrder: "desc" };
}

async function fetchTickets(sorting: SortingState): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>("/api/tickets", {
    params: toSortParams(sorting),
    withCredentials: true,
  });
  return res.data.tickets;
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["tickets", sorting],
    queryFn: () => fetchTickets(sorting),
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
      {tickets && tickets.length > 0 && (
        <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  );
}
