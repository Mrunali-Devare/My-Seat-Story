import { createFileRoute, redirect } from "@tanstack/react-router";

// The demo has no real accounts, so there is no password to reset: send people to the login page.
export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
