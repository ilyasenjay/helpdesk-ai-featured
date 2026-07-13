import { X } from "lucide-react";
import { NewUserForm } from "./NewUserForm";

interface Props {
  onClose: () => void;
}

export function NewUserModal({ onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div data-testid="modal-overlay" className="modal-backdrop" onClick={onClose} />
      <div className="modal-panel max-w-md">
        <div className="modal-header">
          <h2 className="font-heading text-lg font-semibold">New User</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="icon-button"
          >
            <X size={18} />
          </button>
        </div>
        <NewUserForm onSuccess={onClose} onCancel={onClose} />
      </div>
    </div>
  );
}
