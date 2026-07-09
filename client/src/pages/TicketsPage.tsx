import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { TicketsTable, TicketsTableSkeleton, categoryLabels } from "../components/TicketsTable";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { TicketStatus } from "../lib/ticket-status";
import { TicketCategory } from "../lib/ticket-category";
import type { Ticket, TicketCategoryFilter, TicketSortColumn } from "../lib/tickets";

type StatusFilter = TicketStatus | "ALL";
type CategoryFilter = TicketCategoryFilter | "ALL";

const statusLabels: Record<StatusFilter, string> = {
  ALL: "All statuses",
  [TicketStatus.open]: "Open",
  [TicketStatus.resolved]: "Resolved",
  [TicketStatus.closed]: "Closed",
};

const categoryFilterLabels: Record<CategoryFilter, string> = {
  ALL: "All categories",
  NONE: "Uncategorized",
  ...categoryLabels,
};

interface TicketsFilters {
  status: StatusFilter;
  category: CategoryFilter;
  search: string;
}

function toSortParams(sorting: SortingState): { sortBy: TicketSortColumn; sortOrder: "asc" | "desc" } {
  const [sort] = sorting;
  return sort
    ? { sortBy: sort.id as TicketSortColumn, sortOrder: sort.desc ? "desc" : "asc" }
    : { sortBy: "createdAt", sortOrder: "desc" };
}

async function fetchTickets(sorting: SortingState, filters: TicketsFilters): Promise<Ticket[]> {
  const res = await axios.get<{ tickets: Ticket[] }>("/api/tickets", {
    params: {
      ...toSortParams(sorting),
      ...(filters.status !== "ALL" && { status: filters.status }),
      ...(filters.category !== "ALL" && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
    },
    withCredentials: true,
  });
  return res.data.tickets;
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters: TicketsFilters = { status, category, search };

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ["tickets", sorting, filters],
    queryFn: () => fetchTickets(sorting, filters),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tickets</h1>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select<StatusFilter> value={status} onValueChange={(value) => setStatus(value ?? "ALL")}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status">
              {(value: StatusFilter) => statusLabels[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value={TicketStatus.open}>Open</SelectItem>
            <SelectItem value={TicketStatus.resolved}>Resolved</SelectItem>
            <SelectItem value={TicketStatus.closed}>Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select<CategoryFilter> value={category} onValueChange={(value) => setCategory(value ?? "ALL")}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Category">
              {(value: CategoryFilter) => categoryFilterLabels[value]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            <SelectItem value={TicketCategory.generalQuestion}>
              {categoryLabels[TicketCategory.generalQuestion]}
            </SelectItem>
            <SelectItem value={TicketCategory.technicalQuestion}>
              {categoryLabels[TicketCategory.technicalQuestion]}
            </SelectItem>
            <SelectItem value={TicketCategory.refundRequest}>
              {categoryLabels[TicketCategory.refundRequest]}
            </SelectItem>
            <SelectItem value="NONE">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search subject..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-56"
        />
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
