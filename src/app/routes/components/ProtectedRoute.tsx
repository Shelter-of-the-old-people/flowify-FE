import { Navigate, Outlet, useLocation } from "react-router";

import { ROUTE_PATHS, isAuthenticated } from "@/shared";

export const ProtectedRoute = () => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname }}
        to={ROUTE_PATHS.LOGIN}
      />
    );
  }

  return <Outlet />;
};
