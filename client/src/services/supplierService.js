import api from "./api";

// Organization suppliers: people who work for a seller (one seller at a time).
// List: { data: [...], meta } with params { search, status, sellerId, assigned ("true" | "false"), page, limit }.
// Each supplier: { id, name, email, phone, status, seller: { id, name, status } | null }.
export const getSuppliers = async (params = {}) => {
  const response = await api.get("/suppliers", { params });
  return response.data;
};

export const getSupplierById = async (id) => {
  const response = await api.get(`/suppliers/${id}`);
  return response.data;
};

// data: { name, email, phone?, status?, sellerId? } (name and email are required; sellerId assigns right away)
export const createSupplier = async (data) => {
  const response = await api.post("/suppliers", data);
  return response.data;
};

// data: { name?, email?, phone?, status? }. The seller is changed with assign / unassign, not here.
export const updateSupplier = async (id, data) => {
  const response = await api.put(`/suppliers/${id}`, data);
  return response.data;
};

// Put an unassigned supplier under a seller. A supplier already working under a seller must be unassigned first.
export const assignSupplier = async (id, sellerId) => {
  const response = await api.post(`/suppliers/${id}/assign`, { sellerId });
  return response.data;
};

export const unassignSupplier = async (id) => {
  const response = await api.post(`/suppliers/${id}/unassign`);
  return response.data;
};

export const deleteSupplier = async (id) => {
  const response = await api.delete(`/suppliers/${id}`);
  return response.data;
};
