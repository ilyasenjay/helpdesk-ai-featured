import axios from "axios";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersTable, UsersTableSkeleton, type User } from "../components/UsersTable";
import { Button } from "../components/ui/button";
import { NewUserModal } from "../components/NewUserModal";
import { EditUserModal } from "../components/EditUserModal";
import { DeleteUserModal } from "../components/DeleteUserModal";

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<{ users: User[] }>("/api/users", {
    withCredentials: true,
  });
  return res.data.users;
}

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Users</h1>
        <Button onClick={() => setShowModal(true)}>New User</Button>
      </div>

      {isLoading && <UsersTableSkeleton />}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {!isLoading && !error && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found.</p>
      )}
      {users && users.length > 0 && (
        <UsersTable users={users} onEdit={setEditingUser} onDelete={setDeletingUser} />
      )}

      {showModal && <NewUserModal onClose={() => setShowModal(false)} />}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
      {deletingUser && (
        <DeleteUserModal user={deletingUser} onClose={() => setDeletingUser(null)} />
      )}
    </div>
  );
}
