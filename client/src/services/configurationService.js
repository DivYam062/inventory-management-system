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
