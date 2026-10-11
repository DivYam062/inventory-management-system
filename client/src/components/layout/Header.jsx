import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

const Header = () => {
  const { user, organization, isSuperAdmin } = useSelector((state) => state.auth);

  const profilePath = isSuperAdmin ? "/super-admin/profile" : `/${organization?.companyRoute}/profile`;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Inventory Management
        </h2>
      </div>

      <Link
        to={profilePath}
        title="My profile"
        className="-mr-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gray-50"
      >
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">
            {user?.name}
          </p>

          <p className="text-xs text-gray-500">
            {isSuperAdmin ? "System Admin" : user?.role?.name}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </Link>
    </header>
  );
};

export default Header;
