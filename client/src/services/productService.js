import api from "./api";

export const getProducts = async (params = {}) => {
  const response = await api.get("/products", { params });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Product create/update always go through multipart form data so the optional
// image file can travel alongside the regular fields in one request.
const buildFormData = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (key === "imageFile") {
      if (value) formData.append("image", value);
      return;
    }
    if (key === "removeImage") {
      if (value) formData.append("removeImage", "true");
      return;
    }
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return formData;
};

export const createProduct = async (data) => {
  const response = await api.post("/products", buildFormData(data), {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`/products/${id}`, buildFormData(data), {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
