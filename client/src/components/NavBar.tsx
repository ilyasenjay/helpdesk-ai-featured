import { NavLink, useNavigate } from "react-router-dom";
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
    <nav className="flex items-center justify-between border-b border-border bg-card px-6 py-3.5">
      <NavLink
        to="/"
        className="font-heading text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
      >
        Helpdesk
      </NavLink>
      <div className="flex items-center gap-5">
        <NavLink to="/tickets" className={navLinkClass}>
          Tickets
        </NavLink>
        {session?.user.role === Role.admin && (
          <NavLink to="/users" className={navLinkClass}>
            Users
          </NavLink>
        )}
        {session?.user.name && (
          <span className="border-l border-border pl-5 text-sm text-muted-foreground">
            {session.user.name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-sm transition-colors ${
    isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
  }`;
}
