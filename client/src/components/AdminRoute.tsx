import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Role } from "../lib/roles";

export default function AdminRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return session?.user.role === Role.admin ? <Outlet /> : <Navigate to="/" replace />;
}
