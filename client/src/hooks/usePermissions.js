import { useCallback } from "react";
import { useSelector } from "react-redux";

// Permission checks for UX only (routes, sidebar, buttons). The backend enforces the same
// rules on every request.
//   const { can, isSuperAdmin } = usePermissions();
//   can("purchase-order", "create")
export const usePermissions = () => {
  const permissions = useSelector((state) => state.auth.permissions);
  const isSuperAdmin = useSelector((state) => state.auth.isSuperAdmin);

  const can = useCallback(
    (resource, action) => Boolean(permissions?.[resource]?.includes(action)),
    [permissions]
  );

  return { can, isSuperAdmin };
};
