import api from "./api";

// Organization putaways: passed GRN goods moved into inventory. A putaway is a permanent record (no edit or
// delete). List: { data: [...], meta } with params { search (putaway number), grnId, sellerId, page, limit }.
//   { id, putawayNumber, grn: {id, grnNumber, status}, seller, supplier, putawayAt, itemCount, totalQty,
//     performedBy: {id, name} }
// get / create return the full putaway, which also has { notes, items: [{ id, product, unit, quantity }] }.
export const getPutaways = async (params = {}) => {
  const response = await api.get("/putaways", { params });
  return response.data;
};

export const getPutawayById = async (id) => {
  const response = await api.get(`/putaways/${id}`);
  return response.data;
};

// GRNs that still have passed goods to put away (inspected / putaway partial), for the form's dropdown.
// Params { search (GRN number), page, limit }; each: { id, grnNumber, seller, supplier, receivedAt, remainingQty }.
export const getPutawayGrns = async (params = {}) => {
  const response = await api.get("/putaways/grns", { params });
  return response.data;
};

// One GRN's items with what is left to put away:
//   { id, grnNumber, seller, supplier, items: [{ productId, product: {id,name,sku,barcode}, unit, passedQty,
//     putawayQty, remainingQty }] }
export const getPutawayGrnItems = async (grnId) => {
  const response = await api.get(`/putaways/grns/${grnId}`);
  return response.data;
};

// data: { grnId, items: [{ productId, quantity }], putawayAt?, notes? } - at most the remaining passed quantity.
export const createPutaway = async (data) => {
  const response = await api.post("/putaways", data);
  return response.data;
};
