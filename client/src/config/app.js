// The product name shown wherever an organization's own logo is not available.
export const APP_NAME = "Inventory Management ERP";

// Where the API runs. Set VITE_API_URL when building for production (no trailing slash).
export const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
