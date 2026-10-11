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

module.exports = { logAudit, logStatusChange, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS };
