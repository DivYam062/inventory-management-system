import axios from "axios";
import { API_ORIGIN } from "../config/app";

// Every successful API response is { data, meta }: data is the payload, meta is pagination
// ({ total_page, page, per_page, current_page }) or null. Services return that envelope as is.

// Fired when the API rejects a stored token, so the app can log the user out
// (App.jsx listens). An event avoids a circular import between this file and the store.
export const UNAUTHORIZED_EVENT = "auth:unauthorized";

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A failed login is a normal 401 (wrong credentials), not an expired session.
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export default api;
