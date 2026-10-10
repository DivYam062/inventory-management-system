import api from "./api";

// Organization sellers (the external organizations you buy from).
// List: { data: [...], meta } with params { search, status, page, limit }.
// Each seller: { id, name, email, phone, address, status }.
export const getSellers = async (params = {}) => {
  const response = await api.get("/sellers", { params });
  return response.data;
};

export const getSellerById = async (id) => {
  const response = await api.get(`/sellers/${id}`);
  return response.data;
};

// data: { name, email, phone?, address?, status? } (name and email are required)
export const createSeller = async (data) => {
  const response = await api.post("/sellers", data);
  return response.data;
};

export const updateSeller = async (id, data) => {
  const response = await api.put(`/sellers/${id}`, data);
  return response.data;
};

export const deleteSeller = async (id) => {
  const response = await api.delete(`/sellers/${id}`);
  return response.data;
};
