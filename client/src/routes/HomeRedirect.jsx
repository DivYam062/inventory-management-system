import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getHomePath } from "../utils/homePath";

// "/" and unknown URLs: signed-in users go to their dashboard, everyone else to login.
const HomeRedirect = () => {
  const auth = useSelector((state) => state.auth);

  return <Navigate to={auth.isAuthenticated ? getHomePath(auth) : "/login"} replace />;
};

export default HomeRedirect;
