import api from "./api";

export const getSuppliers = async () => {
  const response = await api.get("/suppliers");
  return response.data;
};
