import { API_ORIGIN } from "../config/app";

export const buildImageUrl = (path) => (path ? `${API_ORIGIN}${path}` : null);
