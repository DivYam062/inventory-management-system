import api from "./api";

// The audit log: who did what to which record, and when. Read-only - entries are written by the server when
// something is done and are never edited or deleted.
//
// List: { data: [...], meta } with params { group ("inventory" | "catalog" | "configuration" | "user_role" - what
// each Logs page shows), search (record number, what happened or who), entityType, action, userId, entityId (one
// record's history), from, to (ISO date-times, inclusive), page, limit }, newest first.
// Each entry:
//   { id, entityType ("purchase_order" | "gate_entry" | "grn" | "putaway" | "inventory" | "category" | "product" |
//                     "seller" | "supplier" | "configuration" | "user" | "role"), entityId, entityNumber,
//     action ("created" | "updated" | "issued" | "inspected" | "cancelled" | "deleted" | "status_changed" |
//             "stock_increased" | "stock_decreased" | "assigned" | "unassigned" | "password_changed" | "password_reset"),
//     previousStatus, newStatus, summary,
//     performedBy: { id, name } | null  (the user's current name; id is null if they have been deleted),
//     meta (extra facts; an edit has meta.changes: [{ field, from, to }]), createdAt }
export const getAuditLogs = async (params = {}) => {
  const response = await api.get("/audit-logs", { params });
  return response.data;
};
