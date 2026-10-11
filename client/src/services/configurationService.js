import api from "./api";

// Organization configuration: { currencies: [codes], units: [codes] } - the enabled currencies and units of
// measurement. Update with either or both lists; the API refuses to remove one that products still use.
export const getConfiguration = async () => {
  const response = await api.get("/configuration");
  return response.data;
};

export const updateConfiguration = async (data) => {
  const response = await api.put("/configuration", data);
  return response.data;
};

// Currencies / units the organization defines itself (on top of the system lists). A new one is enabled
// right away. Only custom ones can be deleted, and not while products use them.
//   addCurrency: { code, name, symbol? }     addUnit: { code, name }
export const addCurrency = async (data) => {
  const response = await api.post("/configuration/currencies", data);
  return response.data;
};

export const deleteCurrency = async (code) => {
  const response = await api.delete(`/configuration/currencies/${encodeURIComponent(code)}`);
  return response.data;
};

export const addUnit = async (data) => {
  const response = await api.post("/configuration/units", data);
  return response.data;
};

export const deleteUnit = async (code) => {
  const response = await api.delete(`/configuration/units/${encodeURIComponent(code)}`);
  return response.data;
};
