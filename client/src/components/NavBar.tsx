import { Link, useNavigate } from "react-router-dom";
import { authClient } from "../lib/auth";
import { Role } from "../lib/roles";

export default function NavBar() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <Link to="/" className="font-semibold text-gray-900 hover:text-gray-600 transition-colors">Helpdesk</Link>
      <div className="flex items-center gap-4">
        {session?.user.role === Role.admin && (
          <Link to="/users" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Users
          </Link>
        )}
        {session?.user.name && (
          <span className="text-sm text-gray-600">{session.user.name}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
