import { X } from "lucide-react";
import { EditUserForm } from "./EditUserForm";
import type { User } from "./UsersTable";

interface Props {
  user: User;
  onClose: () => void;
}

export function EditUserModal({ user, onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Edit User</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="icon-button"
          >
            <X size={18} />
          </button>
        </div>
        <EditUserForm user={user} onSuccess={onClose} onCancel={onClose} />
      </div>
    </div>
  );
}
