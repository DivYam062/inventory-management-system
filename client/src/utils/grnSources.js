// Which sources a GRN can be made from, given the modules the organization has on (same table as
// server/config/grnSources.js; keep them in sync):
//
//   Gate Entry  Purchase Order   GRN sources
//   ON          ON / OFF         gate entry, seller + supplier
//   OFF         ON               purchase order, seller + supplier
//   OFF         OFF              seller + supplier
export const GRN_SOURCES = {
  GATE_ENTRY: "gate_entry",
  PURCHASE_ORDER: "purchase_order",
  DIRECT: "direct",
};

export const getAllowedGrnSources = ({ gateEntry, purchaseOrder } = {}) => {
  if (gateEntry) return [GRN_SOURCES.GATE_ENTRY, GRN_SOURCES.DIRECT];
  if (purchaseOrder) return [GRN_SOURCES.PURCHASE_ORDER, GRN_SOURCES.DIRECT];
  return [GRN_SOURCES.DIRECT];
};
