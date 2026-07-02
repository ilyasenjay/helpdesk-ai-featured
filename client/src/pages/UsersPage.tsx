import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { UsersTable, type User } from "../components/UsersTable";
import { Skeleton } from "../components/ui/skeleton";

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<{ users: User[] }>("/api/users", {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UsersPage() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>

      {isLoading && <UsersTableSkeleton />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {users && users.length > 0 && <UsersTable users={users} />}
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {["Name", "Email", "Role", "Joined"].map((col) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
