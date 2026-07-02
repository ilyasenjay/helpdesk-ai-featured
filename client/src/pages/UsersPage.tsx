import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { UsersTable, type User } from "../components/UsersTable";

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

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {users && users.length > 0 && <UsersTable users={users} />}
    </div>
  );
}
