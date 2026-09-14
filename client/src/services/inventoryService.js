import api from "./api";

export const getTransactions = async () => {
  const response = await api.get("/inventory");
  return response.data;
};
