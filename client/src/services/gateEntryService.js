import api from "./api";

// Organization gate entries: goods arriving at the gate, against an issued purchase order or directly from a
// seller. List: { data: [...], meta } with params { search (number / vehicle / challan), status, source
// ("purchase_order" | "direct"), sellerId, supplierId, purchaseOrderId, page, limit }.
//   { id, gateEntryNumber, source, purchaseOrder: {id, poNumber, status, currency} | null, seller, supplier,
//     arrivalAt, vehicleNumber, packages, status }
// get / create / update / cancel return the full entry, which also has { driverName, driverPhone,
// challanNumber, notes, cancelledAt } and the seller's / supplier's email, phone and address.
// Status: pending (waiting for a GRN) -> completed (by GRN), or cancelled.
export const getGateEntries = async (params = {}) => {
  const response = await api.get("/gate-entries", { params });
  return response.data;
};

export const getGateEntryById = async (id) => {
  const response = await api.get(`/gate-entries/${id}`);
  return response.data;
};

// data: { source, purchaseOrderId (purchase_order) | sellerId (direct), supplierId, arrivalAt?, vehicleNumber?,
//         packages?, driverName?, driverPhone?, challanNumber?, notes? }
// Against a purchase order the supplier may be left out (the order's supplier is used).
export const createGateEntry = async (data) => {
  const response = await api.post("/gate-entries", data);
  return response.data;
};

// Pending entries only. (There is no delete: an entry can only be cancelled.) The source, purchase order and seller cannot change; the supplier and the delivery
// details can.
export const updateGateEntry = async (id, data) => {
  const response = await api.put(`/gate-entries/${id}`, data);
  return response.data;
};

export const cancelGateEntry = async (id) => {
  const response = await api.post(`/gate-entries/${id}/cancel`);
  return response.data;
};
