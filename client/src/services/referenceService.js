import api from "./api";

// Reference lists shared by every form that needs them. Both take { search, page, limit } and return
// { data: [...], meta } like every dropdown endpoint.
//   Currencies: [{ code, name, symbol }]
//   Units of measurement: [{ code, name, group }]
export const getCurrencies = async (params = {}) => {
  const response = await api.get("/currencies", { params });
  return response.data;
};

export const getUnits = async (params = {}) => {
  const response = await api.get("/units", { params });
  return response.data;
};
