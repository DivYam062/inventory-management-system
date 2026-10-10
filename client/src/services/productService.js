import api from "./api";

// Organization products (made under a seller, belong to a category, optional image).
// List: { data: [...], meta } with params { search, status, categoryId, sellerId, page, limit }.
// currency and unit are codes from GET /api/currencies and GET /api/units (see referenceService.js).
// Each product: { id, name, sku, description, price, image, status, category: { id, name, status },
// seller: { id, name, status } }.
export const getProducts = async (params = {}) => {
  const response = await api.get("/products", { params });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Create/update go through multipart form data so the optional image travels with the fields.
//   imageFile     File to upload (replaces the current image)
//   removeImage   true to clear the current image
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
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });

  return formData;
};

// data: { name, sku, categoryId, sellerId, unit, price?, currency? (required with a price), description?, status?, imageFile? }
export const createProduct = async (data) => {
  const response = await api.post("/products", buildFormData(data), {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

// Status-only changes (the table toggle) have no file, so they are sent as plain JSON.
export const updateProduct = async (id, data) => {
  const hasFileFields = "imageFile" in data || "removeImage" in data;

  const response = hasFileFields
    ? await api.put(`/products/${id}`, buildFormData(data), { headers: { "Content-Type": undefined } })
    : await api.put(`/products/${id}`, data);

  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};
