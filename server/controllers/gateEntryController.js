const mongoose = require("mongoose");

const GateEntry = require("../models/GateEntry");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const { GATE_ENTRY_STATUS, GATE_ENTRY_SOURCE } = GateEntry;
const { PURCHASE_ORDER_STATUS } = PurchaseOrder;
const { ENTITY_STATUS } = require("../config/constants");
const { getConfiguration } = require("../services/configurationService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");
const { logAudit, logStatusChange, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = require("../services/auditService");

// Gate entries of the caller's organization. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permissions: gate-entry:view to read, :create to add, :edit to change or
// cancel. A gate entry is a record of a real arrival, so it can never be deleted - only cancelled. The whole API is closed while the organization has the Gate Entry module switched off.
//
// A gate entry records goods arriving at the gate, either against an issued purchase order (the seller comes
// from the order) or directly against a seller and supplier. It is pending until a GRN completes it.
// The source, the purchase order and the seller cannot be changed afterwards.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const PHONE_PATTERN = /^[\d+\-\s()]*$/;
const VEHICLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;
const MAX_PACKAGES = 1_000_000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const OPEN_ORDER_STATUSES = [PURCHASE_ORDER_STATUS.ISSUED, PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED];

const isValidStatus = (status) => Object.values(GATE_ENTRY_STATUS).includes(status);

const summarize = (ref, withContact = false) =>
  ref && ref._id
    ? {
        id: ref._id,
        name: ref.name,
        status: ref.status,
        ...(withContact && { email: ref.email, phone: ref.phone, address: ref.address }),
      }
    : null;

const summarizeOrder = (ref) =>
  ref && ref._id ? { id: ref._id, poNumber: ref.poNumber, status: ref.status, currency: ref.currency } : null;

const serializeEntry = (entry, { detailed = false } = {}) => {
  const base = {
    id: entry._id,
    gateEntryNumber: entry.gateEntryNumber,
    source: entry.source,
    purchaseOrder: summarizeOrder(entry.purchaseOrderId),
    seller: summarize(entry.sellerId, detailed),
    supplier: summarize(entry.supplierId, detailed),
    arrivalAt: entry.arrivalAt,
    vehicleNumber: entry.vehicleNumber,
    packages: entry.packages,
    status: entry.status,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };

  if (!detailed) return base;

  return {
    ...base,
    driverName: entry.driverName,
    driverPhone: entry.driverPhone,
    challanNumber: entry.challanNumber,
    notes: entry.notes,
    cancelledAt: entry.cancelledAt,
  };
};

const populateEntry = (query, { detailed = false } = {}) => {
  const fields = detailed ? "name status email phone address" : "name status";
  return query
    .populate("sellerId", fields)
    .populate("supplierId", fields)
    .populate("purchaseOrderId", "poNumber status currency");
};

const loadEntry = (req, id, options) => populateEntry(findByIdInOrg(GateEntry, req, id), options);

const optionalText = (value, label, max) => {
  if (value === undefined || value === null || value === "") return { value: undefined };
  if (typeof value !== "string") return { error: `${label} is invalid` };
  if (value.trim().length > max) return { error: `${label} must be at most ${max} characters` };
  return { value: value.trim() };
};

// Validates the plain fields shared by create and update. `body` holds only the fields to check. Returns
// { values } (only the fields that were present, normalized) or { error }.
const parseDetails = (body) => {
  const values = {};

  if (body.arrivalAt !== undefined) {
    const arrivalAt = body.arrivalAt === "" || body.arrivalAt === null ? new Date() : new Date(body.arrivalAt);
    if (Number.isNaN(arrivalAt.getTime())) return { error: "Arrival time must be a valid date and time" };
    if (arrivalAt.getTime() > Date.now() + CLOCK_SKEW_MS) return { error: "Arrival time cannot be in the future" };
    values.arrivalAt = arrivalAt;
  }

  if (body.vehicleNumber !== undefined) {
    const parsed = optionalText(body.vehicleNumber, "Vehicle number", 20);
    if (parsed.error) return parsed;
    if (parsed.value && !VEHICLE_PATTERN.test(parsed.value)) {
      return { error: "Vehicle number can only contain letters, numbers, spaces and -" };
    }
    values.vehicleNumber = parsed.value;
  }

  for (const [key, label, max] of [
    ["driverName", "Driver name", 100],
    ["challanNumber", "Challan number", 50],
    ["notes", "Notes", 500],
  ]) {
    if (body[key] === undefined) continue;
    const parsed = optionalText(body[key], label, max);
    if (parsed.error) return parsed;
    values[key] = parsed.value;
  }

  if (body.driverPhone !== undefined) {
    const parsed = optionalText(body.driverPhone, "Driver phone", 20);
    if (parsed.error) return parsed;
    if (parsed.value && !PHONE_PATTERN.test(parsed.value)) return { error: "Driver phone can only contain digits, spaces and + - ( )" };
    values.driverPhone = parsed.value;
  }

  if (body.packages !== undefined) {
    if (body.packages === null || body.packages === "") {
      values.packages = undefined;
    } else {
      const packages = Number(body.packages);
      if (!Number.isInteger(packages) || packages < 1 || packages > MAX_PACKAGES) {
        return { error: "Packages must be a whole number of 1 or more" };
      }
      values.packages = packages;
    }
  }

  return { values };
};

// The supplier must exist in the organization, work under the seller and (when newly chosen) be active.
const findSupplierFor = async (req, supplierId, seller, { requireActive }) => {
  if (!mongoose.isValidObjectId(supplierId)) return { error: "Select a supplier" };

  const supplier = await Supplier.findOne(orgFilter(req, { _id: supplierId }));
  if (!supplier) return { error: "Supplier not found" };
  if (!supplier.sellerId || String(supplier.sellerId) !== String(seller._id)) {
    return { error: `Supplier "${supplier.name}" does not work under seller "${seller.name}"` };
  }
  if (requireActive && supplier.status !== ENTITY_STATUS.ACTIVE) return { error: `Supplier "${supplier.name}" is inactive` };

  return { supplier };
};

const createGateEntry = async (req, res) => {
  const { source, purchaseOrderId, sellerId, supplierId } = req.body;

  if (!Object.values(GATE_ENTRY_SOURCE).includes(source)) {
    return fail(res, 400, "Choose whether the goods arrive against a purchase order or directly from a seller");
  }

  const details = parseDetails(req.body);
  if (details.error) return fail(res, 400, details.error);

  let seller;
  let order;

  if (source === GATE_ENTRY_SOURCE.PURCHASE_ORDER) {
    const configuration = await getConfiguration(req.organizationId);
    if (!configuration.modules.purchaseOrder) {
      return fail(res, 400, "The Purchase Order module is turned off, so entries cannot be made against a purchase order");
    }

    if (!mongoose.isValidObjectId(purchaseOrderId)) return fail(res, 400, "Select a purchase order");

    order = await findByIdInOrg(PurchaseOrder, req, purchaseOrderId);
    if (!order) return fail(res, 400, "Purchase order not found");
    if (!OPEN_ORDER_STATUSES.includes(order.status)) {
      return fail(res, 400, `${order.poNumber} is ${order.status.replace("_", " ")}. Only an issued purchase order can have a gate entry`);
    }

    seller = await Seller.findOne(orgFilter(req, { _id: order.sellerId }));
    if (!seller) return fail(res, 400, "The seller of this purchase order was not found");
  } else {
    if (!mongoose.isValidObjectId(sellerId)) return fail(res, 400, "Select a seller");

    seller = await Seller.findOne(orgFilter(req, { _id: sellerId }));
    if (!seller) return fail(res, 400, "Seller not found");
    if (seller.status !== ENTITY_STATUS.ACTIVE) return fail(res, 400, `Seller "${seller.name}" is inactive`);
  }

  // Against a purchase order the supplier defaults to the order's own; another supplier of the same seller
  // may deliver instead.
  const found = await findSupplierFor(req, supplierId ?? (order && order.supplierId), seller, { requireActive: true });
  if (found.error) return fail(res, 400, found.error);

  // The number is taken last, after everything else has been checked, so failed requests do not use one.
  const sequence = await Counter.nextSequence(req.organizationId, "gate-entry");

  const entry = await GateEntry.create({
    organizationId: req.organizationId, // always from the caller
    gateEntryNumber: `GE-${String(sequence).padStart(5, "0")}`,
    source,
    purchaseOrderId: order ? order._id : undefined,
    sellerId: seller._id,
    supplierId: found.supplier._id,
    arrivalAt: details.values.arrivalAt ?? new Date(),
    ...details.values,
    status: GATE_ENTRY_STATUS.PENDING,
    createdBy: req.user._id,
  });

  const saved = await loadEntry(req, entry._id, { detailed: true });

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.GATE_ENTRY,
    entity: { id: entry._id, number: entry.gateEntryNumber },
    action: AUDIT_ACTIONS.CREATED,
    newStatus: entry.status,
    summary: `Recorded ${entry.gateEntryNumber} from ${saved.sellerId?.name ?? "the seller"}${order ? ` against ${order.poNumber}` : " (no purchase order)"}`,
    meta: { source, purchaseOrder: order ? order.poNumber : null, vehicleNumber: entry.vehicleNumber, packages: entry.packages },
  });

  return sendSuccess(res, serializeEntry(saved, { detailed: true }), { status: 201 });
};

const getGateEntries = async (req, res) => {
  const { search, status, source, sellerId, supplierId, purchaseOrderId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ gateEntryNumber: pattern }, { vehicleNumber: pattern }, { challanNumber: pattern }];
  }

  if (isValidStatus(status)) query.status = status;
  if (Object.values(GATE_ENTRY_SOURCE).includes(source)) query.source = source;
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) query.sellerId = sellerId;
  if (typeof supplierId === "string" && mongoose.isValidObjectId(supplierId)) query.supplierId = supplierId;
  if (typeof purchaseOrderId === "string" && mongoose.isValidObjectId(purchaseOrderId)) query.purchaseOrderId = purchaseOrderId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [entries, total] = await Promise.all([
    populateEntry(GateEntry.find(query))
      .sort({ arrivalAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    GateEntry.countDocuments(query),
  ]);

  return sendSuccess(res, entries.map((entry) => serializeEntry(entry)), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getGateEntryById = async (req, res) => {
  const entry = await loadEntry(req, req.params.id, { detailed: true });
  if (!entry) return fail(res, 404, "Gate entry not found");

  return sendSuccess(res, serializeEntry(entry, { detailed: true }));
};

// Only a pending entry can be edited. The source, purchase order and seller are fixed; the supplier (of the
// same seller) and the delivery details can change.
const updateGateEntry = async (req, res) => {
  const entry = await findByIdInOrg(GateEntry, req, req.params.id);
  if (!entry) return fail(res, 404, "Gate entry not found");

  if (entry.status !== GATE_ENTRY_STATUS.PENDING) {
    return fail(res, 400, "Only a pending gate entry can be edited");
  }

  const { source, purchaseOrderId, sellerId, supplierId } = req.body;

  const differs = (sent, saved) => sent !== undefined && String(sent ?? "") !== String(saved ?? "");
  if (differs(source, entry.source) || differs(purchaseOrderId, entry.purchaseOrderId) || differs(sellerId, entry.sellerId)) {
    return fail(res, 400, "The source, purchase order and seller cannot be changed. Cancel this entry and create a new one");
  }

  const details = parseDetails(req.body);
  if (details.error) return fail(res, 400, details.error);

  if (supplierId !== undefined && String(supplierId) !== String(entry.supplierId)) {
    const seller = await Seller.findOne(orgFilter(req, { _id: entry.sellerId }));
    if (!seller) return fail(res, 400, "The seller was not found");

    const found = await findSupplierFor(req, supplierId, seller, { requireActive: true });
    if (found.error) return fail(res, 400, found.error);

    entry.supplierId = found.supplier._id;
  }

  Object.entries(details.values).forEach(([key, value]) => {
    entry[key] = value;
  });

  await entry.save();

  const saved = await loadEntry(req, entry._id, { detailed: true });

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.GATE_ENTRY,
    entity: { id: entry._id, number: entry.gateEntryNumber },
    action: AUDIT_ACTIONS.UPDATED,
    previousStatus: entry.status,
    newStatus: entry.status,
    summary: `Edited ${entry.gateEntryNumber}`,
  });

  return sendSuccess(res, serializeEntry(saved, { detailed: true }));
};

// pending -> cancelled. The record stays (the vehicle did arrive).
const cancelGateEntry = async (req, res) => {
  const entry = await findByIdInOrg(GateEntry, req, req.params.id);
  if (!entry) return fail(res, 404, "Gate entry not found");

  if (entry.status !== GATE_ENTRY_STATUS.PENDING) {
    return fail(res, 400, "Only a pending gate entry can be cancelled");
  }

  entry.status = GATE_ENTRY_STATUS.CANCELLED;
  entry.cancelledAt = new Date();
  await entry.save();

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.GATE_ENTRY,
    entity: { id: entry._id, number: entry.gateEntryNumber },
    action: AUDIT_ACTIONS.CANCELLED,
    previousStatus: GATE_ENTRY_STATUS.PENDING,
    newStatus: GATE_ENTRY_STATUS.CANCELLED,
    summary: `Cancelled ${entry.gateEntryNumber}`,
  });

  const saved = await loadEntry(req, entry._id, { detailed: true });
  return sendSuccess(res, serializeEntry(saved, { detailed: true }));
};

module.exports = {
  createGateEntry,
  getGateEntries,
  getGateEntryById,
  updateGateEntry,
  cancelGateEntry,
};
