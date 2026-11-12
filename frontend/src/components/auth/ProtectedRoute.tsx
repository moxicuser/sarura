import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "../ui";
import { useAuth } from "../../lib/auth";

/** Wrap protected routes. Visitors are sent to login and returned afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="sarura-container py-12">
        <LoadingState />
      </div>
    );
  }

  if (status === "anonymous") {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
