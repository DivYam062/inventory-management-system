import api from "./api";

// Organization purchase orders. List: { data: [...], meta } with params { search (PO number), status,
// sellerId, supplierId, page, limit }. A list row has no items:
//   { id, poNumber, seller: {id,name,status}, supplier: {id,name,status}, orderDate, expectedDate, currency,
//     totalAmount, itemCount, status }
// get / create / update / issue / cancel return the full order, which also has { notes, issuedAt, cancelledAt,
// items: [{ id, product: {id,name,sku,image,status}, quantity, unit, unitPrice, lineTotal, receivedQuantity }] }.
// Status: draft -> issued -> partially_received / received (by GRN), or cancelled.
export const getPurchaseOrders = async (params = {}) => {
  const response = await api.get("/purchase-orders", { params });
  return response.data;
};

export const getPurchaseOrderById = async (id) => {
  const response = await api.get(`/purchase-orders/${id}`);
  return response.data;
};

// data: { sellerId, supplierId, currency, orderDate?, expectedDate?, notes?, items: [{ productId, quantity, unitPrice }] }
export const createPurchaseOrder = async (data) => {
  const response = await api.post("/purchase-orders", data);
  return response.data;
};

// Draft orders only. Same fields as create; items, when sent, replace the whole list.
export const updatePurchaseOrder = async (id, data) => {
  const response = await api.put(`/purchase-orders/${id}`, data);
  return response.data;
};

export const issuePurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/issue`);
  return response.data;
};

export const cancelPurchaseOrder = async (id) => {
  const response = await api.post(`/purchase-orders/${id}/cancel`);
  return response.data;
};

// Draft orders only.
export const deletePurchaseOrder = async (id) => {
  const response = await api.delete(`/purchase-orders/${id}`);
  return response.data;
};
