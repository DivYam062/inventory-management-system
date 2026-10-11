const mongoose = require("mongoose");

const AuditLog = require("../models/AuditLog");
const { AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = AuditLog;
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter } = require("../utils/orgScope");

// The audit log of the caller's organization: who did what to which record, and when. Read-only - entries are
// written by the services that do the work (services/auditService.js) and are never edited or deleted. Every
// query is scoped by req.organizationId (taken from the token, never from the request).
// Permission: audit-log:view.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const parseDate = (value) => {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serialize = (entry) => ({
  id: entry._id,
  entityType: entry.entityType,
  entityId: entry.entityId,
  entityNumber: entry.entityNumber,
  action: entry.action,
  previousStatus: entry.previousStatus,
  newStatus: entry.newStatus,
  summary: entry.summary,
  performedBy: entry.performedBy || entry.performedByName ? { id: entry.performedBy, name: entry.performedByName } : null,
  meta: entry.meta,
  createdAt: entry.createdAt,
});

// Filters: search (record number, what happened or who did it), entityType, action, userId, entityId (one
// record's history), from / to (ISO date-times, inclusive), page, limit. Newest first.
const getAuditLogs = async (req, res) => {
  const { search, entityType, action, userId, entityId, from, to, page, limit } = req.query;

  const query = orgFilter(req);

  if (Object.values(AUDIT_ENTITY_TYPES).includes(entityType)) query.entityType = entityType;
  if (Object.values(AUDIT_ACTIONS).includes(action)) query.action = action;
  if (typeof userId === "string" && mongoose.isValidObjectId(userId)) query.performedBy = userId;
  if (typeof entityId === "string" && mongoose.isValidObjectId(entityId)) query.entityId = entityId;

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ entityNumber: pattern }, { summary: pattern }, { performedByName: pattern }];
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if ((from && !fromDate) || (to && !toDate)) return fail(res, 400, "Dates must be valid");
  if (fromDate || toDate) {
    query.createdAt = { ...(fromDate && { $gte: fromDate }), ...(toDate && { $lte: toDate }) };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [entries, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return sendSuccess(res, entries.map(serialize), { meta: buildMeta({ page: pageNum, limit: limitNum, total }) });
};

module.exports = { getAuditLogs };
