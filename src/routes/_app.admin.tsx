import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const s = getSession();
      if (!s || s.role !== "admin") {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: () => <Outlet />,
});
