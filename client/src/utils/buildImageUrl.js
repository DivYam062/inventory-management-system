// Matches the API origin hardcoded in services/api.js (no env-based config exists yet in this project).
const API_ORIGIN = "http://localhost:5000";

export const buildImageUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);
