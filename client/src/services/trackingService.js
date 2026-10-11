import api from "./api";

// Tracking: where each purchase order (and each delivery made without one) has got to in the flow
// Purchase Order -> Gate Entry -> GRN -> Putaway, and what has to be done next. Read-only.
//
// List: { data: [...], meta } with params { type ("purchase_order" | "direct"), search (document number),
// sellerId, stage (one or several, comma separated), needsAction ("true"), page, limit }. Each tracker:
//   { type ("purchase_order" | "gate_entry" | "grn"), id, number, status, seller, supplier,
//     stage, stageLabel, isComplete, needsAction, lastActivityAt,
//     stages: [{ key, label, state ("done" | "current" | "pending" | "skipped" | "cancelled"),
//                documents: [{ id, number, status, at }] }],
//     actions: [{ key, label, target ("purchase_order" | "grn_create" | "grn" | "putaway" | null),
//                 documentId, documentNumber, permission: [resource, action] | null }] }
// Stage: draft | awaiting_delivery | at_gate | awaiting_inspection | awaiting_putaway | completed | cancelled.
export const getTrackers = async (params = {}) => {
  const response = await api.get("/tracking", { params });
  return response.data;
};

// { total, needsAction, stages: { draft, awaiting_delivery, ... } } for the same `type` / `search` / `sellerId`.
export const getTrackingSummary = async (params = {}) => {
  const response = await api.get("/tracking/summary", { params });
  return response.data;
};

// One tracker in full (route type: "purchase-orders" | "gate-entries" | "grns"): the tracker above plus
//   items: [{ product, unit, orderedQty (null without a purchase order), receivedQty, atInspectionQty, passedQty,
//             failedQty, putawayQty, toPutawayQty, pendingDeliveryQty, status }]
// item status: not_arrived | partially_arrived | awaiting_inspection | awaiting_putaway | in_inventory.
export const getTracker = async (routeType, id) => {
  const response = await api.get(`/tracking/${routeType}/${id}`);
  return response.data;
};
