import { Navigate, Outlet } from "react-router-dom";
import { authClient } from "../lib/auth";

export default function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
