import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { fetchCurrentUser, logout } from "./store/slices/authSlice";
import { UNAUTHORIZED_EVENT } from "./services/api";
import LoadingState from "./components/common/LoadingState";

function App() {
  const dispatch = useDispatch();
  const { token, user, isInitializing } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [token, user, dispatch]);

  // The API rejected the stored token (expired, user/organization deactivated): sign out.
  useEffect(() => {
    const handleUnauthorized = () => dispatch(logout());

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [dispatch]);

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState message="Loading your session..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
