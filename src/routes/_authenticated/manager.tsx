import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Film, CalendarRange } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/manager")({
  component: ManagerLayout,
});

function ManagerLayout() {
  const { roles } = useAuth();
  const allowed = roles.includes("manager") || roles.includes("admin");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Theater Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your shows, screens, and revenue.</p>

        {!allowed ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-muted-foreground">
            You don't have manager access. Sign in with the demo manager account to see this area.
          </div>
        ) : (
          <>
            <nav className="mt-6 flex flex-wrap gap-2 rounded-xl border border-border/60 bg-card p-1.5 shadow-card">
              <Link to="/manager" activeOptions={{ exact: true }} activeProps={{ className: "bg-primary/20 text-foreground" }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                <LayoutDashboard className="size-4" /> Dashboard
              </Link>
              <Link to="/manager/shows" activeProps={{ className: "bg-primary/20 text-foreground" }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                <CalendarRange className="size-4" /> Shows
              </Link>
              <Link to="/manager/movies" activeProps={{ className: "bg-primary/20 text-foreground" }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                <Film className="size-4" /> Movies
              </Link>
            </nav>
            <div className="mt-6">
              <Outlet />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
