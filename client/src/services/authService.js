import api from "./api";

// data: { email, password }. The email identifies the account and its organization.
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

// data: { name?, phone? }. Email, role and organization can never be changed.
export const updateProfile = async (data) => {
  const response = await api.put("/auth/profile", data);
  return response.data;
};

// data: { currentPassword, newPassword }. Resolves { data: { token } }: a fresh token for this session
// (every older session is signed out by the change).
export const changePassword = async (data) => {
  const response = await api.put("/auth/password", data);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};
