import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "./ui/button";
import type { User } from "./UsersTable";

interface Props {
  user: User;
  onClose: () => void;
}

async function deleteUser(id: string) {
  await axios.delete(`/api/users/${id}`, { withCredentials: true });
}

export function DeleteUserModal({ user, onClose }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        data-testid="delete-modal-overlay"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm bg-background rounded-lg border shadow-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Delete User</h2>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-1">
          Are you sure you want to delete{" "}
          <span className="font-medium text-foreground">{user.name}</span>?
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          This action cannot be undone.
        </p>

        {mutation.isError && (
          <p className="text-xs text-destructive mb-4">
            {axios.isAxiosError(mutation.error)
              ? mutation.error.response?.data?.message ?? mutation.error.message
              : "Something went wrong"}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
