import api from "./api";

// The organization dashboard. ONE request; the response contains only the sections the signed-in user's role may
// view (and only for modules the organization has switched on), so a missing key means "not for this user":
//   { generatedAt, days: ["2026-10-05", ... today] (UTC), sections: [keys present],
//     products:       { total, active, inactive },
//     categories:     { total, active },
//     sellers:        { total, active },
//     suppliers:      { total, active, unassigned },
//     purchaseOrders: { byStatus, total, open, perDay: [{date, count}], recent: [{ id, poNumber, seller, status, totalAmount, currency, createdAt }] },
//     gateEntries:    { byStatus, total, pending, arrivalsToday, perDay, recent: [{ id, gateEntryNumber, seller, vehicleNumber, status, arrivalAt }] },
//     grns:           { byStatus, total, pendingInspection, perDay, recent: [{ id, grnNumber, seller, status, receivedAt, receivedQty }] },
//     putaways:       { total, lastDays, perDay, recent: [{ id, putawayNumber, grnNumber, totalQty, putawayAt }] },
//     inventory:      { products, inStock, outOfStock, topStock: [{ productId, name, sku, unit, quantity }], changesPerDay },
//     tracking:       { total, needsAction, stages: { draft, awaiting_delivery, ... }, needsActionList: [{ type, id, number, stage, stageLabel, action }] },
//     activity:       { recent: [{ id, entityType, entityNumber, action, summary, performedBy, createdAt }] },
//     users:          { total, active },
//     roles:          { total } }
export const getDashboard = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};
