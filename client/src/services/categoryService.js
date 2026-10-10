// Organization categories. List: { data: [...], meta } with params { search, status, page, limit }.
// Each category: { id, name, description, status, productCount }.
import api from "./api";

export const getCategories = async (params = {}) => {
  const response = await api.get("/categories", { params });
  return response.data;
};

export const getCategoryById = async (id) => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post("/categories", data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};
