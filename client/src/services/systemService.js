import api from "./api";

export const getSystemOverview = async () => {
  const response = await api.get("/system/overview");
  return response.data;
};
