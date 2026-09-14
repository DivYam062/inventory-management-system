import api from "./api";

export const getProducts = async () => {
  const response = await api.get("/products");
  return response.data;
};
