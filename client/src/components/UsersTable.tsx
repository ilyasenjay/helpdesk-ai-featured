import { Pencil } from "lucide-react";
import { Skeleton } from "./ui/skeleton";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  createdAt: string;
};

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
}

export function UsersTable({ users, onEdit }: UsersTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr key={user.id} className={i < users.length - 1 ? "border-b" : ""}>
              <td className="px-4 py-3">{user.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  aria-label={`Edit ${user.name}`}
                  onClick={() => onEdit(user)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil size={15} />
                </button>
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
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {["Name", "Email", "Role", "Joined", ""].map((col) => (
              <th key={col} className="px-4 py-3 text-left font-medium text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className={i < 4 ? "border-b" : ""}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-4" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const styles =
    role === "admin"
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
