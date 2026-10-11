const mongoose = require("mongoose");

const Grn = require("../models/Grn");
const GateEntry = require("../models/GateEntry");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const { GRN_STATUS } = Grn;
const { GATE_ENTRY_STATUS } = GateEntry;
const { PURCHASE_ORDER_STATUS } = PurchaseOrder;
const { ENTITY_STATUS } = require("../config/constants");
const { GRN_SOURCE, getAllowedSources } = require("../config/grnSources");
const { getConfiguration } = require("../services/configurationService");
const { recalculateStatus, addReceived } = require("../services/purchaseOrderService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// GRNs (goods received notes) of the caller's organization. Every query is scoped by req.organizationId
// (taken from the token, never from the request). Permissions: grn:view to read, grn:create to receive goods,
// grn:edit to inspect or cancel. The whole API is closed while the GRN module is switched off.
//
// Flow: receive (pending inspection) -> inspect (passed / failed per item) -> putaway of the passed quantity
// (later phase). A GRN is never deleted; before inspection it can be cancelled.
//
// What a GRN does to other records:
//   - purchase order: the received quantity of each item goes up when goods are received (so two GRNs cannot
//     both claim the same ordered quantity), the failed quantity is given back at inspection, and the order
//     turns partially received / received from the totals;
//   - gate entry: completed when a GRN is made from it, pending again if that GRN is cancelled.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000_000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const OPEN_ORDER_STATUSES = [PURCHASE_ORDER_STATUS.ISSUED, PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED];

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const isValidStatus = (status) => Object.values(GRN_STATUS).includes(status);

const summarize = (ref) => (ref && ref._id ? { id: ref._id, name: ref.name, status: ref.status } : null);

// Total quantity received / passed / failed over all items. (Items can be in different units, so this is a
// plain sum of the quantities.)
const totalsOf = (grn) => ({
  receivedQty: roundTo(grn.items.reduce((sum, item) => sum + item.receivedQty, 0), 3),
  passedQty: roundTo(grn.items.reduce((sum, item) => sum + item.passedQty, 0), 3),
  failedQty: roundTo(grn.items.reduce((sum, item) => sum + item.failedQty, 0), 3),
});

const serializeGrn = (grn, { detailed = false } = {}) => {
  const gateEntry = grn.gateEntryId && grn.gateEntryId._id ? grn.gateEntryId : null;
  const order = grn.purchaseOrderId && grn.purchaseOrderId._id ? grn.purchaseOrderId : null;

  const base = {
    id: grn._id,
    grnNumber: grn.grnNumber,
    source: grn.source,
    gateEntry: gateEntry ? { id: gateEntry._id, gateEntryNumber: gateEntry.gateEntryNumber, status: gateEntry.status } : null,
    purchaseOrder: order ? { id: order._id, poNumber: order.poNumber, status: order.status } : null,
    seller: summarize(grn.sellerId),
    supplier: summarize(grn.supplierId),
    receivedAt: grn.receivedAt,
    itemCount: grn.items.length,
    totals: totalsOf(grn),
    status: grn.status,
    createdAt: grn.createdAt,
    updatedAt: grn.updatedAt,
  };

  if (!detailed) return base;

  return {
    ...base,
    challanNumber: grn.challanNumber,
    notes: grn.notes,
    inspectedAt: grn.inspectedAt,
    cancelledAt: grn.cancelledAt,
    items: grn.items.map((item) => {
      const product = item.productId && item.productId._id ? item.productId : null;
      return {
        id: item._id,
        product: product
          ? { id: product._id, name: product.name, sku: product.sku, barcode: product.barcode, image: product.image }
          : null,
        unit: item.unit,
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        passedQty: item.passedQty,
        failedQty: item.failedQty,
        putawayQty: item.putawayQty,
        remarks: item.remarks,
      };
    }),
  };
};

const populateGrn = (query, { detailed = false } = {}) => {
  query
    .populate("sellerId", "name status")
    .populate("supplierId", "name status")
    .populate("gateEntryId", "gateEntryNumber status")
    .populate("purchaseOrderId", "poNumber status");
  if (detailed) query.populate("items.productId", "name sku barcode image");
  return query;
};

const loadGrn = (req, id, options) => populateGrn(findByIdInOrg(Grn, req, id), options);

const normalizeText = (value, label, max) => {
  if (value === undefined || value === null || value === "") return { value: undefined };
  if (typeof value !== "string") return { error: `${label} is invalid` };
  if (value.trim().length > max) return { error: `${label} must be at most ${max} characters` };
  return { value: value.trim() };
};

const parseQuantity = (value, row, label, { allowZero = false } = {}) => {
  const quantity = Number(value);
  const invalid = value === undefined || value === null || value === "" || !Number.isFinite(quantity) || quantity > MAX_QUANTITY;
  if (invalid || quantity < 0 || (!allowZero && quantity === 0)) {
    return { error: `${row}: ${label} must be ${allowZero ? "0 or more" : "greater than 0"}` };
  }
  return { value: roundTo(quantity, 3) };
};

// ---- source ----------------------------------------------------------------------------------------------

// The modules the organization has on decide which sources may be used.
const sourceAllowed = async (req, source) => {
  const configuration = await getConfiguration(req.organizationId);
  return getAllowedSources({
    gateEntry: configuration.modules.gateEntry,
    purchaseOrder: configuration.modules.purchaseOrder,
  }).includes(source);
};

const SOURCE_NOT_ALLOWED = "This source is not available with your current module settings";

// Whether over-receiving is on: the organization allows it AND the purchase order itself allows it.
const overReceivingAllowed = async (req, order) => {
  if (!order || !order.allowOverReceiving) return false;
  const configuration = await getConfiguration(req.organizationId);
  return Boolean(configuration.purchaseOrder.allowOverReceiving);
};

const findSupplierUnder = async (req, supplierId, seller) => {
  if (!mongoose.isValidObjectId(supplierId)) return { error: "Select a supplier" };

  const supplier = await Supplier.findOne(orgFilter(req, { _id: supplierId }));
  if (!supplier) return { error: "Supplier not found" };
  if (!supplier.sellerId || String(supplier.sellerId) !== String(seller._id)) {
    return { error: `Supplier "${supplier.name}" does not work under seller "${seller.name}"` };
  }
  if (supplier.status !== ENTITY_STATUS.ACTIVE) return { error: `Supplier "${supplier.name}" is inactive` };

  return { supplier };
};

// Resolves what the GRN is made from. Returns { seller, supplier, order, entry, challanNumber } or { error }.
const resolveSource = async (req, body) => {
  const { source, gateEntryId, purchaseOrderId, sellerId, supplierId } = body;

  if (!Object.values(GRN_SOURCE).includes(source)) return { error: "Choose where the goods come from" };
  if (!(await sourceAllowed(req, source))) return { error: SOURCE_NOT_ALLOWED };

  if (source === GRN_SOURCE.GATE_ENTRY) {
    if (!mongoose.isValidObjectId(gateEntryId)) return { error: "Select a gate entry" };

    const entry = await findByIdInOrg(GateEntry, req, gateEntryId);
    if (!entry) return { error: "Gate entry not found" };
    if (entry.status !== GATE_ENTRY_STATUS.PENDING) {
      return { error: `${entry.gateEntryNumber} is ${entry.status}. Only a pending gate entry can be received` };
    }

    const [seller, supplier, order] = await Promise.all([
      Seller.findOne(orgFilter(req, { _id: entry.sellerId })),
      Supplier.findOne(orgFilter(req, { _id: entry.supplierId })),
      entry.purchaseOrderId ? findByIdInOrg(PurchaseOrder, req, entry.purchaseOrderId) : null,
    ]);
    if (!seller || !supplier) return { error: "The seller or supplier of this gate entry was not found" };

    if (order && !OPEN_ORDER_STATUSES.includes(order.status)) {
      return { error: `${order.poNumber} is ${order.status.replace("_", " ")}, so nothing more can be received against it` };
    }

    return { seller, supplier, order, entry, challanNumber: entry.challanNumber };
  }

  if (source === GRN_SOURCE.PURCHASE_ORDER) {
    if (!mongoose.isValidObjectId(purchaseOrderId)) return { error: "Select a purchase order" };

    const order = await findByIdInOrg(PurchaseOrder, req, purchaseOrderId);
    if (!order) return { error: "Purchase order not found" };
    if (!OPEN_ORDER_STATUSES.includes(order.status)) {
      return { error: `${order.poNumber} is ${order.status.replace("_", " ")}. Only an issued purchase order can be received` };
    }

    const seller = await Seller.findOne(orgFilter(req, { _id: order.sellerId }));
    if (!seller) return { error: "The seller of this purchase order was not found" };

    // The order's supplier by default; another active supplier of the same seller may deliver instead.
    const found = await findSupplierUnder(req, supplierId ?? order.supplierId, seller);
    if (found.error) return found;

    return { seller, supplier: found.supplier, order, entry: null };
  }

  // direct
  if (!mongoose.isValidObjectId(sellerId)) return { error: "Select a seller" };

  const seller = await Seller.findOne(orgFilter(req, { _id: sellerId }));
  if (!seller) return { error: "Seller not found" };
  if (seller.status !== ENTITY_STATUS.ACTIVE) return { error: `Seller "${seller.name}" is inactive` };

  const found = await findSupplierUnder(req, supplierId, seller);
  if (found.error) return found;

  return { seller, supplier: found.supplier, order: null, entry: null };
};

// ---- create ----------------------------------------------------------------------------------------------

// Checks the items against the source and returns { items } ready to store, or { error }.
// With a purchase order every product must be on it; without one the products must be made under the seller.
const buildItems = async (req, rawItems, { seller, order }, allowOver) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return { error: "Add at least one item" };
  if (rawItems.length > MAX_ITEMS) return { error: `A GRN can have at most ${MAX_ITEMS} items` };

  const seen = new Set();
  const parsed = [];

  for (const [index, item] of rawItems.entries()) {
    const row = `Item ${index + 1}`;
    if (!item || typeof item !== "object") return { error: `${row} is invalid` };

    if (!mongoose.isValidObjectId(item.productId)) return { error: `${row}: select a product` };
    const productId = String(item.productId);
    if (seen.has(productId)) return { error: `${row}: this product is already on the GRN` };
    seen.add(productId);

    const quantity = parseQuantity(item.receivedQty, row, "received quantity");
    if (quantity.error) return quantity;

    const remarks = normalizeText(item.remarks, "Remarks", 200);
    if (remarks.error) return { error: `${row}: ${remarks.error}` };

    parsed.push({ productId, receivedQty: quantity.value, remarks: remarks.value });
  }

  const products = new Map(
    (await Product.find(orgFilter(req, { _id: { $in: parsed.map((item) => item.productId) } }))).map((product) => [
      String(product._id),
      product,
    ])
  );

  const items = [];

  for (const item of parsed) {
    const product = products.get(item.productId);
    if (!product) return { error: "One of the products was not found" };

    let orderedQty = null;

    if (order) {
      const line = order.items.find((orderItem) => String(orderItem.productId) === item.productId);
      if (!line) return { error: `Product "${product.name}" is not on ${order.poNumber}` };

      orderedQty = line.quantity;

      if (!allowOver) {
        const room = roundTo(line.quantity - line.receivedQuantity, 3);
        if (item.receivedQty > room + 1e-9) {
          return {
            error: `"${product.name}": only ${Math.max(room, 0)} ${line.unit} left on ${order.poNumber} (ordered ${line.quantity}, received ${line.receivedQuantity}). Over-receiving is not allowed`,
          };
        }
      }
    } else {
      if (String(product.sellerId) !== String(seller._id)) {
        return { error: `Product "${product.name}" is not made under seller "${seller.name}"` };
      }
      if (product.status !== ENTITY_STATUS.ACTIVE) return { error: `Product "${product.name}" is inactive` };
    }

    items.push({
      productId: product._id,
      unit: order ? order.items.find((orderItem) => String(orderItem.productId) === item.productId).unit : product.unit,
      orderedQty,
      receivedQty: item.receivedQty,
      remarks: item.remarks,
    });
  }

  return { items };
};

const createGrn = async (req, res) => {
  const { receivedAt } = req.body;

  const notes = normalizeText(req.body.notes, "Notes", 500);
  if (notes.error) return fail(res, 400, notes.error);

  const challan = normalizeText(req.body.challanNumber, "Challan number", 50);
  if (challan.error) return fail(res, 400, challan.error);

  let receivedDate = new Date();
  if (receivedAt !== undefined && receivedAt !== null && receivedAt !== "") {
    receivedDate = new Date(receivedAt);
    if (Number.isNaN(receivedDate.getTime())) return fail(res, 400, "Received time must be a valid date and time");
    if (receivedDate.getTime() > Date.now() + CLOCK_SKEW_MS) return fail(res, 400, "Received time cannot be in the future");
  }

  const context = await resolveSource(req, req.body);
  if (context.error) return fail(res, 400, context.error);

  const { seller, supplier, order, entry } = context;

  const allowOver = await overReceivingAllowed(req, order);
  const built = await buildItems(req, req.body.items, context, allowOver);
  if (built.error) return fail(res, 400, built.error);

  // Everything is checked. Now claim the gate entry and reserve the order quantities; if anything fails, what
  // was claimed so far is given back (no multi-document transaction is available on every deployment).
  const undo = [];
  const rollback = async () => {
    for (const step of undo.reverse()) await step();
  };

  try {
    if (entry) {
      const claimed = await GateEntry.findOneAndUpdate(
        { _id: entry._id, organizationId: req.organizationId, status: GATE_ENTRY_STATUS.PENDING },
        { status: GATE_ENTRY_STATUS.COMPLETED },
        { returnDocument: "after" }
      );
      if (!claimed) return fail(res, 400, `${entry.gateEntryNumber} has already been received`);
      undo.push(() => GateEntry.updateOne({ _id: entry._id }, { status: GATE_ENTRY_STATUS.PENDING }));
    }

    if (order) {
      for (const item of built.items) {
        const applied = await addReceived(order._id, item.productId, item.receivedQty, allowOver ? {} : { maxTotal: item.orderedQty });
        if (!applied) {
          await rollback();
          return fail(res, 400, "The purchase order was just updated by someone else. Reload it and try again");
        }
        undo.push(() => addReceived(order._id, item.productId, -item.receivedQty));
      }
    }

    // The number is taken last, after everything else has gone through.
    const sequence = await Counter.nextSequence(req.organizationId, "grn");

    const grn = await Grn.create({
      organizationId: req.organizationId, // always from the caller
      grnNumber: `GRN-${String(sequence).padStart(5, "0")}`,
      source: req.body.source,
      gateEntryId: entry ? entry._id : undefined,
      purchaseOrderId: order ? order._id : undefined,
      sellerId: seller._id,
      supplierId: supplier._id,
      receivedAt: receivedDate,
      challanNumber: challan.value ?? context.challanNumber,
      notes: notes.value,
      items: built.items,
      status: GRN_STATUS.PENDING_INSPECTION,
      createdBy: req.user._id,
    });

    if (order) {
      const fresh = await PurchaseOrder.findById(order._id);
      recalculateStatus(fresh);
      await fresh.save();
    }

    const saved = await loadGrn(req, grn._id, { detailed: true });
    return sendSuccess(res, serializeGrn(saved, { detailed: true }), { status: 201 });
  } catch (error) {
    await rollback();
    throw error;
  }
};

// ---- source items (for the form) -------------------------------------------------------------------------

// What a GRN made from a gate entry or purchase order starts from: the seller, the supplier and - when there is
// a purchase order - its items with how much is still to receive. Needs only grn:create, so the form works
// without access to the purchase order pages.
const getSource = async (req, res) => {
  const { gateEntryId, purchaseOrderId } = req.query;

  const source = gateEntryId ? GRN_SOURCE.GATE_ENTRY : GRN_SOURCE.PURCHASE_ORDER;
  if (!gateEntryId && !purchaseOrderId) return fail(res, 400, "Select a gate entry or a purchase order");

  const context = await resolveSource(req, { source, gateEntryId, purchaseOrderId });
  if (context.error) return fail(res, 400, context.error);

  const { seller, supplier, order, entry } = context;

  const products = order
    ? new Map(
        (await Product.find(orgFilter(req, { _id: { $in: order.items.map((item) => item.productId) } }))).map((product) => [
          String(product._id),
          product,
        ])
      )
    : new Map();

  const allowOver = await overReceivingAllowed(req, order);

  return sendSuccess(res, {
    source,
    gateEntry: entry ? { id: entry._id, gateEntryNumber: entry.gateEntryNumber, challanNumber: entry.challanNumber } : null,
    purchaseOrder: order ? { id: order._id, poNumber: order.poNumber, allowOverReceiving: allowOver } : null,
    seller: { id: seller._id, name: seller.name },
    supplier: { id: supplier._id, name: supplier.name },
    items: order
      ? order.items.map((item) => {
          const product = products.get(String(item.productId));
          return {
            productId: item.productId,
            product: product ? { id: product._id, name: product.name, sku: product.sku, barcode: product.barcode } : null,
            unit: item.unit,
            orderedQty: item.quantity,
            receivedQty: item.receivedQuantity,
            pendingQty: Math.max(roundTo(item.quantity - item.receivedQuantity, 3), 0),
          };
        })
      : [],
  });
};

// ---- read ------------------------------------------------------------------------------------------------

const getGrns = async (req, res) => {
  const { search, status, source, sellerId, supplierId, purchaseOrderId, gateEntryId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    query.grnNumber = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  if (isValidStatus(status)) query.status = status;
  if (Object.values(GRN_SOURCE).includes(source)) query.source = source;
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) query.sellerId = sellerId;
  if (typeof supplierId === "string" && mongoose.isValidObjectId(supplierId)) query.supplierId = supplierId;
  if (typeof purchaseOrderId === "string" && mongoose.isValidObjectId(purchaseOrderId)) query.purchaseOrderId = purchaseOrderId;
  if (typeof gateEntryId === "string" && mongoose.isValidObjectId(gateEntryId)) query.gateEntryId = gateEntryId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [grns, total] = await Promise.all([
    populateGrn(Grn.find(query))
      .sort({ receivedAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Grn.countDocuments(query),
  ]);

  return sendSuccess(res, grns.map((grn) => serializeGrn(grn)), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getGrnById = async (req, res) => {
  const grn = await loadGrn(req, req.params.id, { detailed: true });
  if (!grn) return fail(res, 404, "GRN not found");

  return sendSuccess(res, serializeGrn(grn, { detailed: true }));
};

// ---- inspect ---------------------------------------------------------------------------------------------

// Records, for every item, how much passed and how much failed (together they must equal what was received).
// The failed quantity is given back to the purchase order, so a replacement can be received against it.
const inspectGrn = async (req, res) => {
  const grn = await findByIdInOrg(Grn, req, req.params.id);
  if (!grn) return fail(res, 404, "GRN not found");

  if (grn.status !== GRN_STATUS.PENDING_INSPECTION) {
    return fail(res, 400, "Only a GRN that is pending inspection can be inspected");
  }

  const rawItems = req.body.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return fail(res, 400, "Enter the passed and failed quantity of every item");

  const byProduct = new Map();
  for (const item of rawItems) {
    if (!item || !mongoose.isValidObjectId(item.productId)) return fail(res, 400, "An item is invalid");
    byProduct.set(String(item.productId), item);
  }

  const results = [];

  for (const [index, line] of grn.items.entries()) {
    const row = `Item ${index + 1}`;
    const input = byProduct.get(String(line.productId));
    if (!input) return fail(res, 400, `${row}: enter the passed and failed quantity`);

    const passed = parseQuantity(input.passedQty, row, "passed quantity", { allowZero: true });
    if (passed.error) return fail(res, 400, passed.error);
    const failed = parseQuantity(input.failedQty, row, "failed quantity", { allowZero: true });
    if (failed.error) return fail(res, 400, failed.error);

    if (Math.abs(roundTo(passed.value + failed.value, 3) - line.receivedQty) > 1e-9) {
      return fail(res, 400, `${row}: passed (${passed.value}) + failed (${failed.value}) must equal the received quantity (${line.receivedQty})`);
    }

    const remarks = normalizeText(input.remarks, "Remarks", 200);
    if (remarks.error) return fail(res, 400, `${row}: ${remarks.error}`);

    results.push({ line, passed: passed.value, failed: failed.value, remarks: remarks.value });
  }

  for (const { line, passed, failed, remarks } of results) {
    line.passedQty = passed;
    line.failedQty = failed;
    if (remarks !== undefined) line.remarks = remarks;
  }

  grn.status = GRN_STATUS.INSPECTED;
  grn.inspectedAt = new Date();
  grn.inspectedBy = req.user._id;
  await grn.save();

  if (grn.purchaseOrderId) {
    for (const { line, failed } of results) {
      if (failed > 0) await addReceived(grn.purchaseOrderId, line.productId, -failed);
    }

    const order = await PurchaseOrder.findById(grn.purchaseOrderId);
    if (order) {
      recalculateStatus(order);
      await order.save();
    }
  }

  const saved = await loadGrn(req, grn._id, { detailed: true });
  return sendSuccess(res, serializeGrn(saved, { detailed: true }));
};

// ---- cancel ----------------------------------------------------------------------------------------------

// Before inspection a GRN can be cancelled (it was entered wrongly): the purchase order gets the quantity back
// and the gate entry is pending again, ready for a new GRN. The record itself stays.
const cancelGrn = async (req, res) => {
  const grn = await findByIdInOrg(Grn, req, req.params.id);
  if (!grn) return fail(res, 404, "GRN not found");

  if (grn.status !== GRN_STATUS.PENDING_INSPECTION) {
    return fail(res, 400, "Only a GRN that is pending inspection can be cancelled");
  }

  grn.status = GRN_STATUS.CANCELLED;
  grn.cancelledAt = new Date();
  await grn.save();

  if (grn.purchaseOrderId) {
    for (const line of grn.items) await addReceived(grn.purchaseOrderId, line.productId, -line.receivedQty);

    const order = await PurchaseOrder.findById(grn.purchaseOrderId);
    if (order) {
      recalculateStatus(order);
      await order.save();
    }
  }

  if (grn.gateEntryId) {
    await GateEntry.updateOne(
      { _id: grn.gateEntryId, organizationId: req.organizationId, status: GATE_ENTRY_STATUS.COMPLETED },
      { status: GATE_ENTRY_STATUS.PENDING }
    );
  }

  const saved = await loadGrn(req, grn._id, { detailed: true });
  return sendSuccess(res, serializeGrn(saved, { detailed: true }));
};

module.exports = { createGrn, getSource, getGrns, getGrnById, inspectGrn, cancelGrn };
