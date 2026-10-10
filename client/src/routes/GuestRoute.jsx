import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { getHomePath } from "../utils/homePath";

// Public pages (login). Signed-in users are sent to their dashboard instead.
const GuestRoute = () => {
  const auth = useSelector((state) => state.auth);

  if (auth.isAuthenticated) {
    return <Navigate to={getHomePath(auth)} replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
