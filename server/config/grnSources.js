const GRN_SOURCE = {
  GATE_ENTRY: "gate_entry",
  PURCHASE_ORDER: "purchase_order",
  DIRECT: "direct",
};

// Which sources a GRN can be made from, given which modules the organization has on:
//
//   Gate Entry  Purchase Order   GRN sources
//   ON          ON               gate entry, seller + supplier
//   ON          OFF              gate entry, seller + supplier
//   OFF         ON               purchase order, seller + supplier
//   OFF         OFF              seller + supplier
//
// (With Gate Entry on, goods are first recorded at the gate - against a purchase order or directly - and
// the GRN is made from that entry; with it off the GRN is made straight from the order or the seller.)
// The client has the same table in utils/grnSources.js; keep them in sync.
const getAllowedSources = ({ gateEntry, purchaseOrder }) => {
  if (gateEntry) return [GRN_SOURCE.GATE_ENTRY, GRN_SOURCE.DIRECT];
  if (purchaseOrder) return [GRN_SOURCE.PURCHASE_ORDER, GRN_SOURCE.DIRECT];
  return [GRN_SOURCE.DIRECT];
};

module.exports = { GRN_SOURCE, getAllowedSources };
