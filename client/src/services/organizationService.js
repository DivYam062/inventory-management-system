import api from "./api";

export const getOrganizations = async (params = {}) => {
  const response = await api.get("/organizations", { params });
  return response.data;
};

export const getOrganizationById = async (id) => {
  const response = await api.get(`/organizations/${id}`);
  return response.data;
};

// Create/update go through multipart form data so the optional logo file travels with the fields.
//   logoFile      File to upload (replaces the current logo)
//   removeLogo    true to clear the current logo
//   branding      sent as a JSON string (multipart fields are flat)
const buildFormData = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (key === "logoFile") {
      if (value) formData.append("logo", value);
      return;
    }
    if (key === "removeLogo") {
      if (value) formData.append("removeLogo", "true");
      return;
    }
    if (key === "branding") {
      formData.append("branding", JSON.stringify(value));
      return;
    }
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  return formData;
};

export const createOrganization = async (data) => {
  const response = await api.post("/organizations", buildFormData(data), {
    headers: { "Content-Type": undefined },
  });
  return response.data;
};

// Status-only changes (the table toggle) have no file, so they are sent as plain JSON.
export const updateOrganization = async (id, data) => {
  const hasFileFields = "logoFile" in data || "removeLogo" in data;

  const response = hasFileFields
    ? await api.put(`/organizations/${id}`, buildFormData(data), { headers: { "Content-Type": undefined } })
    : await api.put(`/organizations/${id}`, data);

  return response.data;
};

export const deleteOrganization = async (id) => {
  const response = await api.delete(`/organizations/${id}`);
  return response.data;
};
