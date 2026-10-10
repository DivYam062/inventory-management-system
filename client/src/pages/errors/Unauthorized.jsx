import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getHomePath } from "../../utils/homePath";

const Unauthorized = () => {
  const auth = useSelector((state) => state.auth);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Access denied</h1>
      <p className="mt-2 text-sm text-gray-500">
        You do not have permission to view this page.
      </p>

      <Link
        to={auth.isAuthenticated ? getHomePath(auth) : "/login"}
        className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {auth.isAuthenticated ? "Back to dashboard" : "Go to login"}
      </Link>
    </div>
  );
};

export default Unauthorized;
