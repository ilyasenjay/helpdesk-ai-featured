import { useEffect, useState } from "react";
import { UsersTable, type User } from "../components/UsersTable";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then((data) => setUsers(data.users))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unknown error")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {!loading && !error && users.length > 0 && <UsersTable users={users} />}
    </div>
  );
}
