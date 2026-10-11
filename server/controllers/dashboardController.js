const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const GateEntry = require("../models/GateEntry");
const Grn = require("../models/Grn");
const Putaway = require("../models/Putaway");
const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const Role = require("../models/Role");
const { getConfiguration } = require("../services/configurationService");
const { hasPermission } = require("../services/permissionService");
const { loadTrackers } = require("./trackingController");
const { STAGES } = require("../services/trackingService");
const { sendSuccess } = require("../utils/response");

// The organization dashboard. ONE request returns the numbers for the signed-in user's dashboard, but only the
// sections that user may see:
//   - a section is included only when the user has VIEW permission on the feature it measures (a custom role
//     with only "product: view" gets only the products section; the Network Admin / Support roles have every
//     permission, so they get everything);
//   - a section of a module the organization has switched off (purchase order, gate entry, GRN / putaway) is left
//     out for everyone.
// Sections the user may not see are simply absent from the response - the data is never sent and then hidden by
// the client. Every query is scoped by req.organizationId (taken from the token, never from the request).
// No extra permission is needed to open the dashboard itself: it shows whatever the role allows (possibly nothing).
//
// Day buckets (the 7-day charts) are UTC days.

const DAYS = 7;
const RECENT = 5;

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const lastDays = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: DAYS }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (DAYS - 1 - index));
    return day.toISOString().slice(0, 10);
  });
};

const windowStart = (days) => new Date(`${days[0]}T00:00:00.000Z`);

const countByStatus = async (Model, organizationId, extraMatch = {}) => {
  const rows = await Model.aggregate([
    { $match: { organizationId: toObjectId(organizationId), ...extraMatch } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
};

const countPerDay = async (Model, organizationId, dateField, days, extraMatch = {}) => {
  const rows = await Model.aggregate([
    { $match: { organizationId: toObjectId(organizationId), [dateField]: { $gte: windowStart(days) }, ...extraMatch } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}`, timezone: "UTC" } }, count: { $sum: 1 } } },
  ]);
  const byDay = new Map(rows.map((row) => [row._id, row.count]));
  return days.map((date) => ({ date, count: byDay.get(date) ?? 0 }));
};

const sum = (counts, ...statuses) => statuses.reduce((total, status) => total + (counts[status] ?? 0), 0);
const total = (counts) => Object.values(counts).reduce((all, count) => all + count, 0);

const names = (refs) => (refs && refs._id ? { id: refs._id, name: refs.name } : null);

const productsSection = async (organizationId) => {
  const counts = await countByStatus(Product, organizationId);
  return { total: total(counts), active: sum(counts, "active"), inactive: sum(counts, "inactive") };
};

const categoriesSection = async (organizationId) => {
  const counts = await countByStatus(Category, organizationId);
  return { total: total(counts), active: sum(counts, "active") };
};

const sellersSection = async (organizationId) => {
  const counts = await countByStatus(Seller, organizationId);
  return { total: total(counts), active: sum(counts, "active") };
};

const suppliersSection = async (organizationId) => {
  const counts = await countByStatus(Supplier, organizationId);
  const unassigned = await Supplier.countDocuments({ organizationId, sellerId: null });
  return { total: total(counts), active: sum(counts, "active"), unassigned };
};

const purchaseOrdersSection = async (organizationId, days) => {
  const [byStatus, perDay, recent] = await Promise.all([
    countByStatus(PurchaseOrder, organizationId),
    countPerDay(PurchaseOrder, organizationId, "createdAt", days),
    PurchaseOrder.find({ organizationId }).sort({ createdAt: -1, _id: -1 }).limit(RECENT).populate("sellerId", "name").lean(),
  ]);

  return {
    byStatus,
    total: total(byStatus),
    open: sum(byStatus, "issued", "partially_received"),
    perDay,
    recent: recent.map((order) => ({
      id: order._id,
      poNumber: order.poNumber,
      seller: names(order.sellerId),
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
    })),
  };
};

const gateEntriesSection = async (organizationId, days) => {
  const todayStart = new Date(`${days[days.length - 1]}T00:00:00.000Z`);

  const [byStatus, perDay, arrivalsToday, recent] = await Promise.all([
    countByStatus(GateEntry, organizationId),
    countPerDay(GateEntry, organizationId, "arrivalAt", days),
    GateEntry.countDocuments({ organizationId, arrivalAt: { $gte: todayStart } }),
    GateEntry.find({ organizationId }).sort({ arrivalAt: -1, _id: -1 }).limit(RECENT).populate("sellerId", "name").lean(),
  ]);

  return {
    byStatus,
    total: total(byStatus),
    pending: sum(byStatus, "pending"),
    arrivalsToday,
    perDay,
    recent: recent.map((entry) => ({
      id: entry._id,
      gateEntryNumber: entry.gateEntryNumber,
      seller: names(entry.sellerId),
      vehicleNumber: entry.vehicleNumber,
      status: entry.status,
      arrivalAt: entry.arrivalAt,
    })),
  };
};

const grnsSection = async (organizationId, days) => {
  const [byStatus, perDay, recent] = await Promise.all([
    countByStatus(Grn, organizationId),
    countPerDay(Grn, organizationId, "receivedAt", days, { status: { $ne: "cancelled" } }),
    Grn.find({ organizationId }).sort({ receivedAt: -1, _id: -1 }).limit(RECENT).populate("sellerId", "name").lean(),
  ]);

  return {
    byStatus,
    total: total(byStatus),
    pendingInspection: sum(byStatus, "pending_inspection"),
    perDay,
    recent: recent.map((grn) => ({
      id: grn._id,
      grnNumber: grn.grnNumber,
      seller: names(grn.sellerId),
      status: grn.status,
      receivedAt: grn.receivedAt,
      receivedQty: roundTo(grn.items.reduce((all, item) => all + item.receivedQty, 0), 3),
    })),
  };
};

const putawaysSection = async (organizationId, days) => {
  const [totalCount, perDay, recent] = await Promise.all([
    Putaway.countDocuments({ organizationId }),
    countPerDay(Putaway, organizationId, "putawayAt", days),
    Putaway.find({ organizationId }).sort({ putawayAt: -1, _id: -1 }).limit(RECENT).populate("grnId", "grnNumber").lean(),
  ]);

  return {
    total: totalCount,
    lastDays: perDay.reduce((all, day) => all + day.count, 0),
    perDay,
    recent: recent.map((putaway) => ({
      id: putaway._id,
      putawayNumber: putaway.putawayNumber,
      grnNumber: putaway.grnId?.grnNumber ?? null,
      totalQty: roundTo(putaway.items.reduce((all, item) => all + item.quantity, 0), 3),
      putawayAt: putaway.putawayAt,
    })),
  };
};

const inventorySection = async (organizationId, days) => {
  const orgId = toObjectId(organizationId);

  const [summary, topStock, perDay] = await Promise.all([
    Inventory.aggregate([
      { $match: { organizationId: orgId } },
      { $group: { _id: null, products: { $sum: 1 }, inStock: { $sum: { $cond: [{ $gt: ["$quantity", 0] }, 1, 0] } } } },
    ]),
    Inventory.aggregate([
      { $match: { organizationId: orgId, quantity: { $gt: 0 } } },
      { $sort: { quantity: -1, _id: 1 } },
      { $limit: RECENT },
      { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
    ]),
    countPerDay(InventoryTransaction, organizationId, "createdAt", days),
  ]);

  const products = summary[0]?.products ?? 0;
  const inStock = summary[0]?.inStock ?? 0;

  return {
    products,
    inStock,
    outOfStock: products - inStock,
    topStock: topStock.map((row) => ({
      productId: row.productId,
      name: row.product.name,
      sku: row.product.sku,
      unit: row.product.unit,
      quantity: roundTo(row.quantity, 3),
    })),
    changesPerDay: perDay,
  };
};

// Where everything is in the flow, and what needs doing (the same figures as the Stock Tracking page).
const trackingSection = async (req) => {
  const [orders, direct] = await Promise.all([loadTrackers(req, "purchase_order"), loadTrackers(req, "direct")]);
  const trackers = [...orders, ...direct];

  const stages = Object.fromEntries(Object.values(STAGES).map((stage) => [stage, 0]));
  trackers.forEach((tracker) => {
    stages[tracker.stage] += 1;
  });

  const needing = trackers.filter((tracker) => tracker.needsAction).sort((a, b) => b.lastActivityAt - a.lastActivityAt);

  return {
    total: trackers.length,
    needsAction: needing.length,
    stages,
    needsActionList: needing.slice(0, RECENT).map((tracker) => ({
      type: tracker.type,
      id: tracker.id,
      number: tracker.number,
      stage: tracker.stage,
      stageLabel: tracker.stageLabel,
      action: tracker.actions.find((action) => action.target)?.label ?? null,
    })),
  };
};

const activitySection = async (organizationId) => {
  const entries = await AuditLog.find({ organizationId }).populate("performedBy", "name").sort({ createdAt: -1, _id: -1 }).limit(8).lean();

  return {
    recent: entries.map((entry) => ({
      id: entry._id,
      entityType: entry.entityType,
      entityNumber: entry.entityNumber,
      action: entry.action,
      summary: entry.summary,
      // The user's current name; the saved one only if they have been deleted.
      performedBy: entry.performedBy && entry.performedBy._id ? entry.performedBy.name : entry.performedByName ?? null,
      createdAt: entry.createdAt,
    })),
  };
};

const usersSection = async (organizationId) => {
  const [totalCount, active] = await Promise.all([
    User.countDocuments({ organizationId }),
    User.countDocuments({ organizationId, status: "active" }),
  ]);
  return { total: totalCount, active };
};

const rolesSection = async (organizationId) => ({ total: await Role.countDocuments({ organizationId }) });

const getDashboard = async (req, res) => {
  const organizationId = req.organizationId;
  const { modules } = await getConfiguration(organizationId);
  const days = lastDays();

  const can = (resource) => hasPermission(req.permissions, resource, "view");

  // key -> how to build it, for every section the user may see. (Putaway is part of the GRN module.)
  const builders = {};
  if (can("product")) builders.products = () => productsSection(organizationId);
  if (can("category")) builders.categories = () => categoriesSection(organizationId);
  if (can("seller")) builders.sellers = () => sellersSection(organizationId);
  if (can("supplier")) builders.suppliers = () => suppliersSection(organizationId);
  if (can("purchase-order") && modules.purchaseOrder) builders.purchaseOrders = () => purchaseOrdersSection(organizationId, days);
  if (can("gate-entry") && modules.gateEntry) builders.gateEntries = () => gateEntriesSection(organizationId, days);
  if (can("grn") && modules.grn) builders.grns = () => grnsSection(organizationId, days);
  if (can("putaway") && modules.grn) builders.putaways = () => putawaysSection(organizationId, days);
  if (can("inventory")) builders.inventory = () => inventorySection(organizationId, days);
  if (can("tracking")) builders.tracking = () => trackingSection(req);
  if (can("audit-log")) builders.activity = () => activitySection(organizationId);
  if (can("user")) builders.users = () => usersSection(organizationId);
  if (can("role")) builders.roles = () => rolesSection(organizationId);

  const entries = await Promise.all(Object.entries(builders).map(async ([key, build]) => [key, await build()]));

  return sendSuccess(res, {
    generatedAt: new Date(),
    days,
    sections: Object.keys(builders),
    ...Object.fromEntries(entries),
  });
};

module.exports = { getDashboard };
