import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { usePermissions } from "../hooks/usePermissions";

// scope="system"       -> Super Admin only
// scope="organization" -> organization users only (Super Admin has no organization data access)
// permission={[resource, action]} -> additionally requires that permission
const ProtectedRoute = ({ scope, permission }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { can, isSuperAdmin } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (scope === "system" && !isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (scope === "organization" && isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permission && !can(...permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
