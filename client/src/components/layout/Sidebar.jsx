import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LogOut } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { usePermissions } from "../../hooks/usePermissions";
import { buildImageUrl } from "../../utils/buildImageUrl";
import { SYSTEM_NAVIGATION, ORGANIZATION_NAVIGATION } from "../../config/navigation";

const Sidebar = () => {
  const organization = useSelector((state) => state.auth.organization);
  const dispatch = useDispatch();
  const { can, isSuperAdmin } = usePermissions();

  // Super Admin and organization users have separate navigation; organization items are
  // additionally filtered by the user's permissions.
  const menuItems = isSuperAdmin
    ? SYSTEM_NAVIGATION
    : ORGANIZATION_NAVIGATION.filter((item) => !item.permission || can(...item.permission));

  const basePath = organization ? `/${organization.companyRoute}` : "";

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-white">
      <div className="flex items-center gap-3 border-b px-6 py-5">
        {!isSuperAdmin && organization?.logo && (
          <img
            src={buildImageUrl(organization.logo)}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover"
          />
        )}

        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-900">
            InventoryHub
          </h1>
          <p className="mt-1 truncate text-xs text-gray-500">
            {isSuperAdmin ? "System Administration" : organization?.name}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={`${basePath}${item.path}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon size={19} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

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
