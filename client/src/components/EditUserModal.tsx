import { X } from "lucide-react";
import { EditUserForm } from "./EditUserForm";
import type { User } from "./UsersTable";

interface Props {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-background rounded-lg border shadow-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <EditUserForm user={user} onSuccess={onClose} onCancel={onClose} />
      </div>
    </div>
  );
}
