import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "@/lib/auth";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const s = await getCurrentSession();
      if (!s || s.role !== "owner") {
        throw redirect({ to: "/dashboard" });
      }
    }
  },
  component: () => <Outlet />,
});
