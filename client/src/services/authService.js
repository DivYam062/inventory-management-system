import api from "./api";

// data: { email, password }. The email identifies the account and its organization.
export const loginUser = async (data) => {
  const response = await api.post("/auth/login", data);
  return response.data;
};

export const getProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};
