const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");
const GateEntry = require("../models/GateEntry");
const Grn = require("../models/Grn");
const Putaway = require("../models/Putaway");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const { getConfiguration } = require("../services/configurationService");
const { buildTracker, TRACKER_TYPES, STAGES } = require("../services/trackingService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter } = require("../utils/orgScope");

// Tracking of the caller's organization: where each purchase order (and each delivery that has no purchase
// order) has got to in the flow  Purchase Order -> Gate Entry -> GRN -> Putaway, what has to be done on it
// next, and how every item is doing. Read-only. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permission: tracking:view.
//
// Two kinds of list:
//   purchase_order  one tracker per purchase order
//   direct          deliveries made without a purchase order: one tracker per direct gate entry, and one per
//                   direct GRN that has no gate entry
// The stages are worked out from the documents (see services/trackingService.js) rather than stored, so they
// can never disagree with the documents themselves. Per list the most recent MAX_ROOTS documents are followed.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_ROOTS = 1000;
const LIST_TYPES = { PURCHASE_ORDER: "purchase_order", DIRECT: "direct" };
const ROUTE_TYPES = {
  "purchase-orders": TRACKER_TYPES.PURCHASE_ORDER,
  "gate-entries": TRACKER_TYPES.GATE_ENTRY,
  grns: TRACKER_TYPES.GRN,
};

const groupBy = (items, keyOf) => {
  const groups = new Map();
  items.forEach((item) => {
    const key = keyOf(item);
    if (key === undefined || key === null) return;
    const id = String(key);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(item);
  });
  return groups;
};

const loadFlows = async (req, type, roots) => {
  const organizationId = req.organizationId;

  let gateEntries = [];
  let grns = [];

  if (type === TRACKER_TYPES.PURCHASE_ORDER) {
    const ids = roots.map((root) => root._id);
    [gateEntries, grns] = await Promise.all([
      GateEntry.find({ organizationId, purchaseOrderId: { $in: ids } }).lean(),
      Grn.find({ organizationId, purchaseOrderId: { $in: ids } }).lean(),
    ]);
  } else if (type === TRACKER_TYPES.GATE_ENTRY) {
    grns = await Grn.find({ organizationId, gateEntryId: { $in: roots.map((root) => root._id) } }).lean();
  } else {
    grns = roots; // the roots are the GRNs themselves
  }

  const putaways = grns.length ? await Putaway.find({ organizationId, grnId: { $in: grns.map((grn) => grn._id) } }).lean() : [];

  const entriesByOrder = groupBy(gateEntries, (entry) => entry.purchaseOrderId);
  const grnsByOrder = groupBy(grns, (grn) => grn.purchaseOrderId);
  const grnsByEntry = groupBy(grns, (grn) => grn.gateEntryId);
  const putawaysByGrn = groupBy(putaways, (putaway) => putaway.grnId);

  return roots.map((root) => {
    const flowGrns =
      type === TRACKER_TYPES.PURCHASE_ORDER
        ? grnsByOrder.get(String(root._id)) ?? []
        : type === TRACKER_TYPES.GATE_ENTRY
          ? grnsByEntry.get(String(root._id)) ?? []
          : [root];

    return {
      type,
      root,
      gateEntries: type === TRACKER_TYPES.PURCHASE_ORDER ? entriesByOrder.get(String(root._id)) ?? [] : [],
      grns: flowGrns,
      putaways: flowGrns.flatMap((grn) => putawaysByGrn.get(String(grn._id)) ?? []),
    };
  });
};

const numberOf = (type, root) =>
  type === TRACKER_TYPES.PURCHASE_ORDER ? root.poNumber : type === TRACKER_TYPES.GATE_ENTRY ? root.gateEntryNumber : root.grnNumber;

const ref = (map, id) => {
  const doc = map.get(String(id));
  return doc ? { id: doc._id, name: doc.name, status: doc.status } : null;
};

const present = (flow, modules, { sellers, suppliers }) => {
  const tracker = buildTracker({ ...flow, modules });

  return {
    type: flow.type,
    id: flow.root._id,
    number: numberOf(flow.type, flow.root),
    status: flow.root.status,
    seller: ref(sellers, flow.root.sellerId),
    supplier: ref(suppliers, flow.root.supplierId),
    stage: tracker.stage,
    stageLabel: tracker.stageLabel,
    isComplete: tracker.isComplete,
    needsAction: tracker.needsAction,
    actions: tracker.actions,
    stages: tracker.stages,
    lastActivityAt: tracker.lastActivityAt,
    createdAt: flow.root.createdAt,
    _items: tracker.items,
  };
};

const loadNames = async (req, roots) => {
  const [sellers, suppliers] = await Promise.all([
    Seller.find(orgFilter(req, { _id: { $in: [...new Set(roots.map((root) => String(root.sellerId)))] } })).select("name status").lean(),
    Supplier.find(orgFilter(req, { _id: { $in: [...new Set(roots.map((root) => String(root.supplierId)))] } })).select("name status").lean(),
  ]);

  return {
    sellers: new Map(sellers.map((seller) => [String(seller._id), seller])),
    suppliers: new Map(suppliers.map((supplier) => [String(supplier._id), supplier])),
  };
};

const loadTrackers = async (req, listType, { search, sellerId } = {}) => {
  const modules = (await getConfiguration(req.organizationId)).modules;
  const pattern = typeof search === "string" && search.trim() ? { $regex: escapeRegex(search.trim()), $options: "i" } : null;
  const sellerFilter = typeof sellerId === "string" && mongoose.isValidObjectId(sellerId) ? { sellerId } : {};

  const sources =
    listType === LIST_TYPES.PURCHASE_ORDER
      ? [{ type: TRACKER_TYPES.PURCHASE_ORDER, query: orgFilter(req, { ...sellerFilter, ...(pattern && { poNumber: pattern }) }), Model: PurchaseOrder }]
      : [
          { type: TRACKER_TYPES.GATE_ENTRY, query: orgFilter(req, { source: "direct", ...sellerFilter, ...(pattern && { gateEntryNumber: pattern }) }), Model: GateEntry },
          // A direct GRN made from a direct gate entry belongs to that gate entry's tracker.
          { type: TRACKER_TYPES.GRN, query: orgFilter(req, { source: "direct", ...sellerFilter, ...(pattern && { grnNumber: pattern }) }), Model: Grn },
        ];

  const flows = [];
  for (const { type, query, Model } of sources) {
    const roots = await Model.find(query).sort({ createdAt: -1 }).limit(MAX_ROOTS).lean();
    if (roots.length) flows.push(...(await loadFlows(req, type, roots)));
  }

  const names = await loadNames(req, flows.map((flow) => flow.root));

  return flows
    .map((flow) => present(flow, modules, names))
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
};

const listTypeOf = (value) => (value === LIST_TYPES.DIRECT ? LIST_TYPES.DIRECT : LIST_TYPES.PURCHASE_ORDER);

const toRow = ({ _items, ...row }) => row;

const getTrackers = async (req, res) => {
  const { stage, needsAction, page, limit } = req.query;

  let trackers = await loadTrackers(req, listTypeOf(req.query.type), req.query);

  if (typeof stage === "string" && stage) {
    const wanted = stage.split(",").filter((value) => Object.values(STAGES).includes(value));
    if (wanted.length > 0) trackers = trackers.filter((tracker) => wanted.includes(tracker.stage));
  }
  if (needsAction === "true") trackers = trackers.filter((tracker) => tracker.needsAction);

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const slice = trackers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  return sendSuccess(res, slice.map(toRow), { meta: buildMeta({ page: pageNum, limit: limitNum, total: trackers.length }) });
};

const getSummary = async (req, res) => {
  const trackers = await loadTrackers(req, listTypeOf(req.query.type), req.query);

  const stages = Object.fromEntries(Object.values(STAGES).map((stage) => [stage, 0]));
  trackers.forEach((tracker) => {
    stages[tracker.stage] += 1;
  });

  return sendSuccess(res, { total: trackers.length, needsAction: trackers.filter((tracker) => tracker.needsAction).length, stages });
};

const getTrackerById = async (req, res) => {
  const type = ROUTE_TYPES[req.params.type];
  if (!type) return fail(res, 404, "Unknown tracking type");
  if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Not found");

  const Model = type === TRACKER_TYPES.PURCHASE_ORDER ? PurchaseOrder : type === TRACKER_TYPES.GATE_ENTRY ? GateEntry : Grn;
  const root = await Model.findOne(orgFilter(req, { _id: req.params.id })).lean();
  if (!root) return fail(res, 404, "Not found");

  // A gate entry or GRN that belongs to a purchase order / gate entry is tracked from that document.
  if (type === TRACKER_TYPES.GATE_ENTRY && root.purchaseOrderId) {
    return fail(res, 400, "This gate entry is tracked from its purchase order");
  }
  if (type === TRACKER_TYPES.GRN && (root.purchaseOrderId || root.gateEntryId)) {
    return fail(res, 400, "This GRN is tracked from its purchase order or gate entry");
  }

  const modules = (await getConfiguration(req.organizationId)).modules;
  const [flow] = await loadFlows(req, type, [root]);
  const names = await loadNames(req, [root]);
  const tracker = present(flow, modules, names);

  const products = await Product.find(orgFilter(req, { _id: { $in: tracker._items.map((item) => item.productId) } }))
    .select("name sku barcode")
    .lean();
  const productById = new Map(products.map((product) => [String(product._id), product]));

  const { _items, ...rest } = tracker;

  return sendSuccess(res, {
    ...rest,
    items: _items.map((item) => {
      const product = productById.get(String(item.productId));
      return {
        ...item,
        productId: undefined,
        product: product ? { id: product._id, name: product.name, sku: product.sku, barcode: product.barcode } : null,
      };
    }),
  });
};

module.exports = { getTrackers, getSummary, getTrackerById, loadTrackers };
