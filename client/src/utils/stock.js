// Single source of truth for stock-level classification, shared by the
// dashboard and product management so the two never disagree.
export const getStockStatus = (product) => {
  if (product.quantity === 0) return "out-of-stock";
  if (product.quantity <= product.minimumStock) return "low-stock";
  return "in-stock";
};
