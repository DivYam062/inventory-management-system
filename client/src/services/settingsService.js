import api from "./api";

export const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

export const updateSettings = async (data) => {
  const response = await api.put("/settings", data);
  return response.data;
};
