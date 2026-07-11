import { Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Role } from "../lib/roles";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

export function UsersTable({ users, onEdit, onDelete }: UsersTableProps) {
  return (
    <div className="table-wrapper">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header-row">
            <th className="table-header-cell">Name</th>
            <th className="table-header-cell">Email</th>
            <th className="table-header-cell">Role</th>
            <th className="table-header-cell">Joined</th>
            <th className="table-cell" />
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr key={user.id} className={i < users.length - 1 ? "border-b" : ""}>
              <td className="table-cell">{user.name}</td>
              <td className="table-cell text-muted-foreground">{user.email}</td>
              <td className="table-cell">
                <RoleBadge role={user.role} />
              </td>
              <td className="table-cell text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="table-cell text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    aria-label={`Edit ${user.name}`}
                    onClick={() => onEdit(user)}
                    className="icon-button"
                  >
                    <Pencil size={15} />
                  </button>
                  {user.role !== Role.admin && (
                    <button
                      aria-label={`Delete ${user.name}`}
                      onClick={() => onDelete(user)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UsersTableSkeleton() {
  return (
    <div className="table-wrapper">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header-row">
            {["Name", "Email", "Role", "Joined", ""].map((col) => (
              <th key={col} className="table-header-cell">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className={i < 4 ? "border-b" : ""}>
              <td className="table-cell"><Skeleton className="h-4 w-32" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-48" /></td>
              <td className="table-cell"><Skeleton className="h-5 w-14 rounded-full" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-24" /></td>
              <td className="table-cell"><Skeleton className="h-4 w-4" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const styles =
    role === Role.admin
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles}`}
    >
      {role}
    </span>
  );
}
