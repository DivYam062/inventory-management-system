import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { fetchCurrentUser, refreshCurrentUser, logout } from "./store/slices/authSlice";
import { UNAUTHORIZED_EVENT } from "./services/api";
import LoadingState from "./components/common/LoadingState";

const SESSION_REFRESH_INTERVAL_MS = 15_000;

function App() {
  const dispatch = useDispatch();
  const { token, user, isInitializing } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [token, user, dispatch]);

  // Permissions and module switches are read when the session starts. When the user comes back to the tab
  // (or the window regains focus) they are read again - at most every 15 seconds - so a role or setting
  // changed meanwhile shows up (menu items appear or disappear) without a manual reload.
  const isSignedIn = Boolean(token && user);

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let lastRefresh = Date.now();

    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < SESSION_REFRESH_INTERVAL_MS) return;

      lastRefresh = Date.now();
      dispatch(refreshCurrentUser());
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [isSignedIn, dispatch]);

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
