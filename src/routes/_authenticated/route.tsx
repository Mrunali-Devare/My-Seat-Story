import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/demo-auth";

export const Route = createFileRoute("/_authenticated")({
  // The demo session lives in localStorage, so this guard can only run in the browser.
  ssr: false,
  beforeLoad: ({ location }) => {
    const user = getCurrentUser();
    if (!user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { user };
  },
  component: () => <Outlet />,
});
