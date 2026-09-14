import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { fetchCurrentUser } from "./store/slices/authSlice";
import { fetchSettings } from "./store/slices/settingsSlice";
import LoadingState from "./components/common/LoadingState";

function App() {
  const dispatch = useDispatch();
  const { token, user, isInitializing } = useSelector((state) => state.auth);
  const settingsLoaded = useSelector((state) => state.settings.loaded);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [token, user, dispatch]);

  useEffect(() => {
    if (token && !settingsLoaded) {
      dispatch(fetchSettings());
    }
  }, [token, settingsLoaded, dispatch]);

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
