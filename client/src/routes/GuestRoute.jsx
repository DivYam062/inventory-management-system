import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { getHomePath } from "../utils/homePath";

const GuestRoute = () => {
  const auth = useSelector((state) => state.auth);

  if (auth.isAuthenticated) {
    return <Navigate to={getHomePath(auth)} replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
