import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import { TicketsTable, TicketsTableSkeleton, categoryLabels } from "../components/TicketsTable";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { TicketStatus, statusLabels } from "../lib/ticket-status";
import { TicketCategory } from "../lib/ticket-category";
import type {
  TicketCategoryFilter,
  TicketPageSize,
  TicketSortColumn,
  TicketsPage as TicketsPageData,
} from "../lib/tickets";
import { ticketPageSizes } from "../lib/tickets";

type StatusFilter = TicketStatus | "ALL";
type CategoryFilter = TicketCategoryFilter | "ALL";

const statusFilterLabels: Record<StatusFilter, string> = {
  ALL: "All statuses",
  ...statusLabels,
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

async function fetchTickets(
  sorting: SortingState,
  filters: TicketsFilters,
  page: number,
  pageSize: TicketPageSize,
): Promise<TicketsPageData> {
  const res = await axios.get<TicketsPageData>("/api/tickets", {
    params: {
      ...toSortParams(sorting),
      ...(filters.status !== "ALL" && { status: filters.status }),
      ...(filters.category !== "ALL" && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
      page,
      pageSize,
    },
    withCredentials: true,
  });
  return res.data;
}

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TicketPageSize>(10);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters: TicketsFilters = { status, category, search };

  useEffect(() => {
    setPage(1);
  }, [sorting, status, category, search, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tickets", sorting, filters, page, pageSize],
    queryFn: () => fetchTickets(sorting, filters, page, pageSize),
  });

  const tickets = data?.tickets;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-xl font-semibold">Tickets</h1>
      </div>

      <div className="mb-3 flex flex-shrink-0 flex-wrap items-center gap-3">
        <Select<StatusFilter> value={status} onValueChange={(value) => setStatus(value ?? "ALL")}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Status">
              {(value: StatusFilter) => statusFilterLabels[value]}
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
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TicketsTable tickets={tickets} sorting={sorting} onSortingChange={setSorting} />
          </div>

          <div className="mt-3 flex flex-shrink-0 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}-{rangeEnd} of {total}
              </span>
              <Select<TicketPageSize>
                value={pageSize}
                onValueChange={(value) => setPageSize(value ?? 10)}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Page size">
                    {(value: TicketPageSize) => `${value} / page`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ticketPageSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
