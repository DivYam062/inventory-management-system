import { useSelector, useDispatch } from "react-redux";
import { LogOut } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { usePermissions } from "../../hooks/usePermissions";
import SidebarBrand from "./SidebarBrand";
import SidebarNav from "./SidebarNav";
import { SYSTEM_NAVIGATION, ORGANIZATION_NAVIGATION, filterNavigation } from "../../config/navigation";

const Sidebar = () => {
  const organization = useSelector((state) => state.auth.organization);
  const dispatch = useDispatch();
  const { can, isSuperAdmin } = usePermissions();

  // Super Admin and organization users have separate navigation; organization items are
  // additionally filtered by the user's permissions.
  const menuItems = isSuperAdmin ? SYSTEM_NAVIGATION : filterNavigation(ORGANIZATION_NAVIGATION, can);

  const basePath = organization ? `/${organization.companyRoute}` : "";

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-white">
      <SidebarBrand organization={organization} isSuperAdmin={isSuperAdmin} />

      <SidebarNav items={menuItems} basePath={basePath} />

      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={19} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
