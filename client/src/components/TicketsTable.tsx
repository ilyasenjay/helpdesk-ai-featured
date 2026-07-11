import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { TicketStatus, statusLabels } from "../lib/ticket-status";
import { TicketCategory } from "../lib/ticket-category";
import type { Ticket } from "../lib/tickets";

interface TicketsTableProps {
  tickets: Ticket[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

const columns: ColumnDef<Ticket>[] = [
  {
    id: "subject",
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row, getValue }) => (
      <Link
        to={`/tickets/${row.original.id}`}
        className="font-medium text-primary hover:underline"
      >
        {getValue<string>()}
      </Link>
    ),
  },
  {
    id: "senderName",
    accessorKey: "senderName",
    header: "From",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.senderName}
        {row.original.customerEmail && (
          <span className="block text-xs">{row.original.customerEmail}</span>
        )}
      </span>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge status={getValue<TicketStatus>()} />,
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ getValue }) => {
      const category = getValue<TicketCategory | null>();
      return <span className="text-muted-foreground">{category ? categoryLabels[category] : "—"}</span>;
    },
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{new Date(getValue<string>()).toLocaleString()}</span>
    ),
  },
  {
    id: "assignedTo",
    accessorKey: "assignedTo",
    header: "Assigned to",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.assignedTo?.name ?? "Unassigned"}
      </span>
    ),
  },
];

export function TicketsTable({ tickets, sorting, onSortingChange }: TicketsTableProps) {
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableMultiSort: false,
    getCoreRowModel: getCoreRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="table-wrapper">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="table-header-row">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="sticky top-0 z-10 bg-muted/50 px-4 py-2 text-left font-medium text-muted-foreground">
                  {header.column.getCanSort() ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon direction={header.column.getIsSorted()} />
                    </button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i < rows.length - 1 ? "border-b" : ""}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
}

export function TicketsTableSkeleton() {
  return (
    <div className="table-wrapper">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header-row">
            {["Subject", "From", "Status", "Category", "Created", "Assigned to"].map((col) => (
              <th key={col} className="table-header-cell">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className={i < 4 ? "border-b" : ""}>
              <td className="table-cell"><Skeleton className="h-4 w-48" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-32" /></td>
              <td className="table-cell"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-28" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-32" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-24" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const categoryLabels: Record<TicketCategory, string> = {
  [TicketCategory.generalQuestion]: "General Question",
  [TicketCategory.technicalQuestion]: "Technical Question",
  [TicketCategory.refundRequest]: "Refund Request",
};

export const statusBadgeStyles: Record<TicketStatus, string> = {
  [TicketStatus.open]: "bg-primary/10 text-primary",
  [TicketStatus.resolved]: "bg-green-100 text-green-700",
  [TicketStatus.closed]: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
