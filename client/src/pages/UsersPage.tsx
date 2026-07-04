import axios from "axios";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersTable, UsersTableSkeleton, type User } from "../components/UsersTable";
import { Button } from "../components/ui/button";
import { NewUserModal } from "../components/NewUserModal";

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<{ users: User[] }>("/api/users", {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Users</h1>
        <Button onClick={() => setShowModal(true)}>New User</Button>
      </div>

      {isLoading && <UsersTableSkeleton />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {users && users.length > 0 && <UsersTable users={users} />}

      {showModal && <NewUserModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
