import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { usePermissions } from "../hooks/usePermissions";

// scope="system"       -> System Admin only
// scope="organization" -> organization users only (System Admin has no organization data access)
// permission={[resource, action]} -> additionally requires that permission
// module="purchaseOrder" | "gateEntry" | "grn" -> additionally requires that the organization has the module on
const ProtectedRoute = ({ scope, permission, module }) => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const modules = useSelector((state) => state.auth.modules);
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

  if (module && modules?.[module] === false) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (permission && !can(...permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
