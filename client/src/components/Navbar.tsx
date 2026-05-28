import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Plus, Shield, Ticket } from "lucide-react";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-ink to-violet-deep text-cream shadow-soft transition-transform group-hover:scale-105 group-hover:rotate-3">
            <span className="font-display text-xl leading-none">E</span>
            <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-coral animate-pulse" />
          </div>
          <span className="font-display text-2xl tracking-tight">Eventora</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            activeProps={{ className: "!text-foreground !bg-muted" }}
          >
            Discover
          </Link>
          {user?.role === "admin" && (
            <Link
              to="/create"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "!text-foreground !bg-muted" }}
            >
              Create event
            </Link>
          )}
          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "!text-foreground !bg-muted" }}
            >
              Admin
            </Link>
          )}
          <Link
            to="/my-bookings"
            className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            activeProps={{ className: "!text-foreground !bg-muted" }}
          >
            My bookings
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <Link
                  to="/create"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-gradient-cta px-4 py-2 text-sm font-semibold text-accent-foreground shadow-soft transition hover:shadow-lift hover:scale-105"
                >
                  <Plus className="h-4 w-4" /> Host
                </Link>
              )}
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Shield className="h-4 w-4" /> Roles
                </Link>
              )}
              <div className="hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-deep to-coral text-sm font-semibold text-cream shadow-soft">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-cream shadow-soft transition hover:scale-105 hover:bg-gradient-cta hover:text-accent-foreground"
              >
                <Ticket className="h-4 w-4" /> Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
