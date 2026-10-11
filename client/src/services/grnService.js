import api from "./api";

// Organization GRNs (goods received notes). List: { data: [...], meta } with params { search (GRN number),
// status, source, sellerId, supplierId, purchaseOrderId, gateEntryId, page, limit }.
//   { id, grnNumber, source ("gate_entry" | "purchase_order" | "direct"), gateEntry: {id, gateEntryNumber} | null,
//     purchaseOrder: {id, poNumber} | null, seller, supplier, receivedAt, itemCount, status }
// get / create / inspect / cancel return the full GRN, which also has { challanNumber, notes, inspectedAt,
// cancelledAt, items: [{ id, product, unit, orderedQty (null without a purchase order), receivedQty, passedQty,
// failedQty, putawayQty, remarks }] }.
// Status: pending_inspection -> inspected -> putaway_partial -> putaway_complete (putaway: later), or cancelled.
export const getGrns = async (params = {}) => {
  const response = await api.get("/grns", { params });
  return response.data;
};

export const getGrnById = async (id) => {
  const response = await api.get(`/grns/${id}`);
  return response.data;
};

// What the form starts from, for { gateEntryId } or { purchaseOrderId }: the seller, the supplier and - when
// there is a purchase order - its items with the quantity still to receive:
//   { source, gateEntry, purchaseOrder: { id, poNumber, allowOverReceiving }, seller, supplier,
//     items: [{ productId, product, unit, orderedQty, receivedQty, pendingQty }] }
export const getGrnSource = async (params) => {
  const response = await api.get("/grns/source", { params });
  return response.data;
};

// data: { source, gateEntryId (gate_entry) | purchaseOrderId (purchase_order) | sellerId + supplierId (direct),
//         items: [{ productId, receivedQty, remarks? }], receivedAt?, challanNumber?, notes? }
export const createGrn = async (data) => {
  const response = await api.post("/grns", data);
  return response.data;
};

// data: { items: [{ productId, passedQty, failedQty, remarks? }] } - every item, passed + failed = received.
export const inspectGrn = async (id, data) => {
  const response = await api.post(`/grns/${id}/inspect`, data);
  return response.data;
};

// Before inspection only. A GRN is never deleted.
export const cancelGrn = async (id) => {
  const response = await api.post(`/grns/${id}/cancel`);
  return response.data;
};
