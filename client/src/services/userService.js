import api from "./api";

// Roles the current user may assign (for the role dropdown): [{ id, name, type }].
export const getAssignableRoles = async () => {
  const response = await api.get("/users/assignable-roles");
  return response.data;
};

// params: { search, status, roleId, page, limit }
export const getUsers = async (params = {}) => {
  const response = await api.get("/users", { params });
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

// data: { name, email, phone?, password, roleId, status? }
export const createUser = async (data) => {
  const response = await api.post("/users", data);
  return response.data;
};

// data: { name?, email?, phone?, roleId?, status?, password? }
export const updateUser = async (id, data) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
