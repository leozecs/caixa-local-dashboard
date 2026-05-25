import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const session = typeof window !== "undefined" ? getSession() : null;
  return (
    <Navigate to={session ? (session.role === "owner" ? "/admin" : "/dashboard") : "/login"} />
  );
}
