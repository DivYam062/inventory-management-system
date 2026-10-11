const mongoose = require("mongoose");

// What the audit log records about: the kinds of record whose changes are kept.
const AUDIT_ENTITY_TYPES = {
  PURCHASE_ORDER: "purchase_order",
  GATE_ENTRY: "gate_entry",
  GRN: "grn",
  PUTAWAY: "putaway",
  INVENTORY: "inventory", // the stock of one product (entityId is the product)
};

const AUDIT_ACTIONS = {
  CREATED: "created",
  UPDATED: "updated",
  ISSUED: "issued",
  INSPECTED: "inspected",
  CANCELLED: "cancelled",
  DELETED: "deleted",
  STATUS_CHANGED: "status_changed", // a record moved on because of something done on another record
  STOCK_INCREASED: "stock_increased",
  STOCK_DECREASED: "stock_decreased",
};

// One line of the audit log: who did what to which record, and when. Rows are only ever added - never edited
// or deleted - so the log is a trustworthy history. The record's number is copied in, so the entry still reads
// correctly after the record is deleted. The user is shown by their CURRENT name (looked up from performedBy, so
// a renamed user appears under the new name everywhere); the copy of the name taken at the time is only a
// fallback for a user who has since been deleted.
const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    entityType: { type: String, enum: Object.values(AUDIT_ENTITY_TYPES), required: true },

    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Readable name of the record: PO-00001, GE-00001, GRN-00001, PUT-00001, or "Cola (C1)" for stock.
    entityNumber: { type: String, required: true },

    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true },

    // For a status change: where the record was and where it went.
    previousStatus: { type: String },
    newStatus: { type: String },

    // One readable sentence: what happened.
    summary: { type: String, required: true, maxlength: 400 },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // The name when it happened - used only if the user no longer exists.
    performedByName: { type: String },

    // Extra facts about the change (quantities, reason, totals, the document that caused it...).
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;
module.exports.AUDIT_ENTITY_TYPES = AUDIT_ENTITY_TYPES;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
