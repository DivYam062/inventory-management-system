import { NavLink } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard,
  Users,
  Tags,
  Truck,
  Package,
  Boxes,
  UserCircle,
  LogOut,
} from "lucide-react";
import { logout } from "../../store/slices/authSlice";

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const isAdmin = user?.role === "admin";

  const menuItems = [
    {
      name: "Dashboard",
      path: isAdmin ? "/admin/dashboard" : "/employee/dashboard",
      icon: LayoutDashboard,
    },
    ...(isAdmin
      ? [
          {
            name: "Users",
            path: "/admin/users",
            icon: Users,
          },
        ]
      : []),
    {
      name: "Categories",
      path: "/categories",
      icon: Tags,
    },
    {
      name: "Suppliers",
      path: "/suppliers",
      icon: Truck,
    },
    {
      name: "Products",
      path: "/products",
      icon: Package,
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: Boxes,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: UserCircle,
    },
  ];

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="border-b px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">
          InventoryHub
        </h1>
        <p className="mt-1 text-xs capitalize text-gray-500">
          {user?.role} Panel
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
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