import api from "./api";

// The features and actions a role can be given: [{ resource, label, group, actions }].
export const getPermissionCatalog = async () => {
  const response = await api.get("/roles/permissions");
  return response.data;
};

export const getRoles = async (params = {}) => {
  const response = await api.get("/roles", { params });
  return response.data;
};

export const getRoleById = async (id) => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

// data: { name, permissions: [{ resource, actions: [] }] }
export const createRole = async (data) => {
  const response = await api.post("/roles", data);
  return response.data;
};

export const updateRole = async (id, data) => {
  const response = await api.put(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};
