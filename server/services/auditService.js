const AuditLog = require("../models/AuditLog");
const { AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = AuditLog;

// The one place the audit log is written. Call it AFTER the change it describes has succeeded:
//
//   await logAudit(req, {
//     entityType: AUDIT_ENTITY_TYPES.PURCHASE_ORDER,
//     entity: { id: order._id, number: order.poNumber },
//     action: AUDIT_ACTIONS.ISSUED,
//     previousStatus: "draft",
//     newStatus: "issued",
//     summary: "Issued PO-00001",
//     meta: { ... },          // optional extra facts
//   });
//
// `req` supplies the organization and the user (always from the token). Writing the log must never break the
// operation that has already happened, so a failure here is reported to the server log and swallowed.
const logAudit = async (req, { entityType, entity, action, previousStatus, newStatus, summary, meta }) => {
  if (!req.organizationId) return; // the System Admin acts outside every organization

  try {
    await AuditLog.create({
      organizationId: req.organizationId,
      entityType,
      entityId: entity.id,
      entityNumber: entity.number,
      action,
      previousStatus,
      newStatus,
      summary: String(summary).slice(0, 400),
      performedBy: req.user ? req.user._id : undefined,
      performedByName: req.user ? req.user.name : undefined,
      meta,
    });
  } catch (error) {
    console.error(`Audit log failed (${entityType} ${entity && entity.number} ${action}): ${error.message}`);
  }
};

// A record moved from one status to another because of something done on another record (an order becoming
// partially received after a GRN, a gate entry completed by a GRN...). Does nothing when the status did not change.
const logStatusChange = (req, { entityType, entity, previousStatus, newStatus, summary, meta }) =>
  previousStatus === newStatus
    ? Promise.resolve()
    : logAudit(req, { entityType, entity, action: AUDIT_ACTIONS.STATUS_CHANGED, previousStatus, newStatus, summary, meta });

// What changed between two versions of a record, for the fields in `labels` ({ fieldName: "Readable name" }):
//   [{ field: "Name", from: "Drinks", to: "Beverages" }, ...]  - empty when nothing that matters changed.
// Values are compared as text (so ids and numbers compare fine) and shown as "—" when empty.
const display = (value) => (value === undefined || value === null || value === "" ? "—" : String(value));

const diffFields = (before, after, labels) =>
  Object.entries(labels).flatMap(([key, field]) =>
    display(before[key]) === display(after[key]) ? [] : [{ field, from: display(before[key]), to: display(after[key]) }]
  );

// "Name: Drinks → Beverages; Status: active → inactive"
const describeChanges = (changes) => changes.map((change) => `${change.field}: ${change.from} → ${change.to}`).join("; ");

module.exports = { logAudit, logStatusChange, diffFields, describeChanges, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS };
