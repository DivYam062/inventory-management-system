import api from "./api";

// Total inventory: the stock of every product that has been put away. Stock rows are created by Putaway and
// never deleted; the quantity changes only through putaway and manual adjustments, each kept in the history.
//
// List: { data: [...], meta } with params { search (name / SKU / barcode), categoryId, sellerId,
// stock ("in_stock" | "out_of_stock"), page, limit }. Each row:
//   { id, product: { id, name, sku, barcode, image, unit, status, category: {id,name}, seller: {id,name} },
//     quantity, status ("in_stock" | "out_of_stock"), updatedAt }
export const getInventory = async (params = {}) => {
  const response = await api.get("/inventory", { params });
  return response.data;
};

// { products, inStock, outOfStock } - how many products have stock records and how many are in / out of stock.
export const getInventorySummary = async () => {
  const response = await api.get("/inventory/summary");
  return response.data;
};

// Every change to one product's stock, newest first. Params { page, limit }. Each:
//   { id, previousQty, changedQty (negative for a decrease), newQty, source ("putaway" | "manual_adjustment"),
//     reason, refNumber (the putaway), performedBy: {id, name}, createdAt }
export const getStockHistory = async (productId, params = {}) => {
  const response = await api.get(`/inventory/${productId}/transactions`, { params });
  return response.data;
};

// data: { type: "increase" | "decrease", quantity, reason (required) }. A decrease cannot take more than is in
// stock. Returns { stock, transaction }.
export const adjustStock = async (productId, data) => {
  const response = await api.post(`/inventory/${productId}/adjust`, data);
  return response.data;
};
