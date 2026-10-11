const mongoose = require("mongoose");

const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const { PURCHASE_ORDER_STATUS } = PurchaseOrder;
const { ENTITY_STATUS } = require("../config/constants");
const { getConfiguration } = require("../services/configurationService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// Purchase orders of the caller's organization. Every query is scoped by req.organizationId (taken from
// the token, never from the request). Permissions: purchase-order:view to read, :create to add,
// :edit to change, issue, cancel or delete. The whole API is closed while the organization has the
// Purchase Order module switched off (Configuration).
//
// An order is raised to one Seller, through one of that seller's Suppliers, for products made under that
// seller. Lifecycle: draft (editable, deletable) -> issued -> (partially) received by GRN, or cancelled.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000_000;
const MAX_PRICE = 1_000_000_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const isValidStatus = (status) => Object.values(PURCHASE_ORDER_STATUS).includes(status);

// { id, name, status }; with `withContact` also the email / phone / address that are printed on the order.
const summarize = (ref, withContact = false) =>
  ref && ref._id
    ? {
        id: ref._id,
        name: ref.name,
        status: ref.status,
        ...(withContact && { email: ref.email, phone: ref.phone, address: ref.address }),
      }
    : null;

const serializeOrder = (order, { withItems = false } = {}) => {
  const base = {
    id: order._id,
    poNumber: order.poNumber,
    seller: summarize(order.sellerId, withItems),
    supplier: summarize(order.supplierId, withItems),
    orderDate: order.orderDate,
    expectedDate: order.expectedDate,
    currency: order.currency,
    allowOverReceiving: order.allowOverReceiving,
    totalAmount: order.totalAmount,
    itemCount: order.items.length,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };

  if (!withItems) return base;

  return {
    ...base,
    notes: order.notes,
    issuedAt: order.issuedAt,
    cancelledAt: order.cancelledAt,
    items: order.items.map((item) => {
      const product = item.productId && item.productId._id ? item.productId : null;
      return {
        id: item._id,
        product: product
          ? { id: product._id, name: product.name, sku: product.sku, image: product.image, status: product.status }
          : null,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        lineTotal: roundTo(item.quantity * item.unitPrice, 2),
        receivedQuantity: item.receivedQuantity,
      };
    }),
  };
};

const populateOrder = (query, { withItems = false } = {}) => {
  // The full order also carries the contact details printed on the document.
  const fields = withItems ? "name status email phone address" : "name status";
  query.populate("sellerId", fields).populate("supplierId", fields);
  if (withItems) query.populate("items.productId", "name sku image status");
  return query;
};

const loadOrder = (req, id, options) => populateOrder(findByIdInOrg(PurchaseOrder, req, id), options);

// "YYYY-MM-DD" -> Date at UTC midnight, or null when it is not a real date.
const parseDate = (value) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
};

const todayUtc = () => parseDate(new Date().toISOString().slice(0, 10));

// Checks the items payload and returns { items } (normalized, productId as string) or { error }.
const parseItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return { error: "Add at least one item" };
  if (items.length > MAX_ITEMS) return { error: `A purchase order can have at most ${MAX_ITEMS} items` };

  const seen = new Set();
  const parsed = [];

  for (const [index, item] of items.entries()) {
    const row = `Item ${index + 1}`;
    if (!item || typeof item !== "object") return { error: `${row} is invalid` };

    if (!mongoose.isValidObjectId(item.productId)) return { error: `${row}: select a product` };
    const productId = String(item.productId);
    if (seen.has(productId)) return { error: `${row}: this product is already on the order` };
    seen.add(productId);

    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
      return { error: `${row}: quantity must be greater than 0` };
    }

    const unitPrice = Number(item.unitPrice);
    if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === "" || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > MAX_PRICE) {
      return { error: `${row}: enter a price of 0 or more` };
    }

    parsed.push({ productId, quantity: roundTo(quantity, 3), unitPrice: roundTo(unitPrice, 2) });
  }

  return { items: parsed };
};

const totalOf = (items) => roundTo(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), 2);

// Seller, supplier and products must exist in the caller's organization, the supplier must work under the
// seller and every product must be made under the seller. `requireActive*` says which of them must also
// be active (the ones being chosen now; older choices may have been deactivated since).
// Returns { seller, supplier, products: Map(productId -> product) } or { error }.
const resolveReferences = async (req, { sellerId, supplierId, productIds, activeSeller, activeSupplier, activeProductIds }) => {
  if (!mongoose.isValidObjectId(sellerId)) return { error: "Select a seller" };

  const seller = await Seller.findOne(orgFilter(req, { _id: sellerId }));
  if (!seller) return { error: "Seller not found" };
  if (activeSeller && seller.status !== ENTITY_STATUS.ACTIVE) return { error: `Seller "${seller.name}" is inactive` };

  if (!mongoose.isValidObjectId(supplierId)) return { error: "Select a supplier" };

  const supplier = await Supplier.findOne(orgFilter(req, { _id: supplierId }));
  if (!supplier) return { error: "Supplier not found" };
  if (!supplier.sellerId || String(supplier.sellerId) !== String(seller._id)) {
    return { error: `Supplier "${supplier.name}" does not work under seller "${seller.name}"` };
  }
  if (activeSupplier && supplier.status !== ENTITY_STATUS.ACTIVE) return { error: `Supplier "${supplier.name}" is inactive` };

  const products = new Map(
    (await Product.find(orgFilter(req, { _id: { $in: productIds } }))).map((product) => [String(product._id), product])
  );

  for (const productId of productIds) {
    const product = products.get(productId);
    if (!product) return { error: "One of the products was not found" };
    if (String(product.sellerId) !== String(seller._id)) {
      return { error: `Product "${product.name}" is not made under seller "${seller.name}"` };
    }
    if (activeProductIds.has(productId) && product.status !== ENTITY_STATUS.ACTIVE) {
      return { error: `Product "${product.name}" is inactive` };
    }
  }

  return { seller, supplier, products };
};

// A currency that is being newly chosen must be enabled in the organization's configuration.
const currencyEnabledError = async (req, currency) => {
  const configuration = await getConfiguration(req.organizationId);
  return configuration.currencies.includes(currency)
    ? null
    : `Currency ${currency} is not enabled. Enable it in Configuration first.`;
};

const normalizeCode = (code) => (typeof code === "string" ? code.trim().toUpperCase() : code);

// Validates the dates, currency and notes shared by create and update. Returns { orderDate, expectedDate }
// (expectedDate may be undefined) or { error }.
const parseDates = (orderDateInput, expectedDateInput) => {
  const orderDate = orderDateInput === undefined || orderDateInput === "" ? todayUtc() : parseDate(orderDateInput);
  if (!orderDate) return { error: "Order date must be a valid date (YYYY-MM-DD)" };

  let expectedDate;
  if (expectedDateInput !== undefined && expectedDateInput !== null && expectedDateInput !== "") {
    expectedDate = parseDate(expectedDateInput);
    if (!expectedDate) return { error: "Expected date must be a valid date (YYYY-MM-DD)" };
    if (expectedDate < orderDate) return { error: "Expected date cannot be before the order date" };
  }

  return { orderDate, expectedDate };
};

// allowOverReceiving may only be turned on while the organization allows over-receiving (Configuration).
// Returns an error message or null. `current` is the saved value on update.
const overReceivingError = async (req, value, current = false) => {
  if (value === undefined) return null;
  if (typeof value !== "boolean") return "allowOverReceiving must be true or false";
  if (!value || value === current) return null;

  const configuration = await getConfiguration(req.organizationId);
  return configuration.purchaseOrder.allowOverReceiving
    ? null
    : "Over-receiving is turned off for your organization. Enable it in Configuration first.";
};

const notesError = (notes) =>
  notes !== undefined && notes !== null && (typeof notes !== "string" || notes.trim().length > 500)
    ? "Notes must be at most 500 characters"
    : null;

const createPurchaseOrder = async (req, res) => {
  const { sellerId, supplierId, orderDate, expectedDate, notes } = req.body;
  const currency = normalizeCode(req.body.currency);

  const parsedItems = parseItems(req.body.items);
  if (parsedItems.error) return fail(res, 400, parsedItems.error);

  const dates = parseDates(orderDate, expectedDate);
  if (dates.error) return fail(res, 400, dates.error);

  if (typeof currency !== "string" || !currency) return fail(res, 400, "Select a currency");
  const currencyProblem = await currencyEnabledError(req, currency);
  if (currencyProblem) return fail(res, 400, currencyProblem);

  const problem = notesError(notes);
  if (problem) return fail(res, 400, problem);

  const overReceivingProblem = await overReceivingError(req, req.body.allowOverReceiving);
  if (overReceivingProblem) return fail(res, 400, overReceivingProblem);

  const productIds = parsedItems.items.map((item) => item.productId);
  const refs = await resolveReferences(req, {
    sellerId,
    supplierId,
    productIds,
    activeSeller: true,
    activeSupplier: true,
    activeProductIds: new Set(productIds),
  });
  if (refs.error) return fail(res, 400, refs.error);

  // The number is taken last, after everything else has been checked, so failed requests do not use one.
  const sequence = await Counter.nextSequence(req.organizationId, "purchase-order");

  const order = await PurchaseOrder.create({
    organizationId: req.organizationId, // always from the caller
    poNumber: `PO-${String(sequence).padStart(5, "0")}`,
    sellerId: refs.seller._id,
    supplierId: refs.supplier._id,
    orderDate: dates.orderDate,
    expectedDate: dates.expectedDate,
    currency,
    allowOverReceiving: req.body.allowOverReceiving === true,
    notes: notes ? notes.trim() : undefined,
    items: parsedItems.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: refs.products.get(item.productId).unit,
      unitPrice: item.unitPrice,
    })),
    totalAmount: totalOf(parsedItems.items),
    status: PURCHASE_ORDER_STATUS.DRAFT,
    createdBy: req.user._id,
  });

  const saved = await loadOrder(req, order._id, { withItems: true });
  return sendSuccess(res, serializeOrder(saved, { withItems: true }), { status: 201 });
};

const getPurchaseOrders = async (req, res) => {
  const { search, status, sellerId, supplierId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    query.poNumber = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  if (isValidStatus(status)) query.status = status;
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) query.sellerId = sellerId;
  if (typeof supplierId === "string" && mongoose.isValidObjectId(supplierId)) query.supplierId = supplierId;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [orders, total] = await Promise.all([
    populateOrder(PurchaseOrder.find(query))
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    PurchaseOrder.countDocuments(query),
  ]);

  return sendSuccess(res, orders.map((order) => serializeOrder(order)), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getPurchaseOrderById = async (req, res) => {
  const order = await loadOrder(req, req.params.id, { withItems: true });
  if (!order) return fail(res, 404, "Purchase order not found");

  return sendSuccess(res, serializeOrder(order, { withItems: true }));
};

// Only a draft can be edited. Fields that are not sent keep their value; the items, when sent, replace the
// whole list. The result is validated as a whole (a new seller needs a matching supplier and products).
const updatePurchaseOrder = async (req, res) => {
  const order = await findByIdInOrg(PurchaseOrder, req, req.params.id);
  if (!order) return fail(res, 404, "Purchase order not found");

  if (order.status !== PURCHASE_ORDER_STATUS.DRAFT) {
    return fail(res, 400, "Only a draft purchase order can be edited");
  }

  const { sellerId, supplierId, orderDate, expectedDate, notes } = req.body;

  const effectiveSellerId = sellerId !== undefined ? sellerId : order.sellerId;
  const effectiveSupplierId = supplierId !== undefined ? supplierId : order.supplierId;

  let items;
  if (req.body.items !== undefined) {
    const parsed = parseItems(req.body.items);
    if (parsed.error) return fail(res, 400, parsed.error);
    items = parsed.items;
  } else {
    items = order.items.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  }

  const dates = parseDates(
    orderDate !== undefined ? orderDate : order.orderDate.toISOString().slice(0, 10),
    expectedDate !== undefined ? expectedDate : order.expectedDate ? order.expectedDate.toISOString().slice(0, 10) : undefined
  );
  if (dates.error) return fail(res, 400, dates.error);

  let currency = order.currency;
  if (req.body.currency !== undefined) {
    currency = normalizeCode(req.body.currency);
    if (typeof currency !== "string" || !currency) return fail(res, 400, "Select a currency");
    if (currency !== order.currency) {
      const currencyProblem = await currencyEnabledError(req, currency);
      if (currencyProblem) return fail(res, 400, currencyProblem);
    }
  }

  if (notes !== undefined) {
    const problem = notesError(notes);
    if (problem) return fail(res, 400, problem);
  }

  const overReceivingProblem = await overReceivingError(req, req.body.allowOverReceiving, order.allowOverReceiving);
  if (overReceivingProblem) return fail(res, 400, overReceivingProblem);

  // Only what is being newly chosen has to be active.
  const sellerChanged = String(effectiveSellerId) !== String(order.sellerId);
  const supplierChanged = sellerChanged || String(effectiveSupplierId) !== String(order.supplierId);
  const existingProductIds = new Set(order.items.map((item) => String(item.productId)));
  const productIds = items.map((item) => item.productId);

  const refs = await resolveReferences(req, {
    sellerId: effectiveSellerId,
    supplierId: effectiveSupplierId,
    productIds,
    activeSeller: sellerChanged,
    activeSupplier: supplierChanged,
    activeProductIds: new Set(productIds.filter((id) => sellerChanged || !existingProductIds.has(id))),
  });
  if (refs.error) return fail(res, 400, refs.error);

  order.sellerId = refs.seller._id;
  order.supplierId = refs.supplier._id;
  order.orderDate = dates.orderDate;
  order.expectedDate = dates.expectedDate;
  order.currency = currency;
  if (notes !== undefined) order.notes = notes ? notes.trim() : undefined;
  if (req.body.allowOverReceiving !== undefined) order.allowOverReceiving = req.body.allowOverReceiving;
  order.items = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unit: refs.products.get(item.productId).unit,
    unitPrice: item.unitPrice,
  }));
  order.totalAmount = totalOf(items);

  await order.save();

  const saved = await loadOrder(req, order._id, { withItems: true });
  return sendSuccess(res, serializeOrder(saved, { withItems: true }));
};

// draft -> issued. The seller, supplier and every product must be active at this point.
const issuePurchaseOrder = async (req, res) => {
  const order = await findByIdInOrg(PurchaseOrder, req, req.params.id);
  if (!order) return fail(res, 404, "Purchase order not found");

  if (order.status !== PURCHASE_ORDER_STATUS.DRAFT) {
    return fail(res, 400, "Only a draft purchase order can be issued");
  }

  const productIds = order.items.map((item) => String(item.productId));
  const refs = await resolveReferences(req, {
    sellerId: order.sellerId,
    supplierId: order.supplierId,
    productIds,
    activeSeller: true,
    activeSupplier: true,
    activeProductIds: new Set(productIds),
  });
  if (refs.error) return fail(res, 400, `Cannot issue: ${refs.error}`);

  order.status = PURCHASE_ORDER_STATUS.ISSUED;
  order.issuedAt = new Date();
  await order.save();

  const saved = await loadOrder(req, order._id, { withItems: true });
  return sendSuccess(res, serializeOrder(saved, { withItems: true }));
};

// draft or issued -> cancelled. Once goods have been received against it, it can no longer be cancelled.
const cancelPurchaseOrder = async (req, res) => {
  const order = await findByIdInOrg(PurchaseOrder, req, req.params.id);
  if (!order) return fail(res, 404, "Purchase order not found");

  if (![PURCHASE_ORDER_STATUS.DRAFT, PURCHASE_ORDER_STATUS.ISSUED].includes(order.status)) {
    return fail(res, 400, "Only a draft or issued purchase order can be cancelled");
  }

  if (order.items.some((item) => item.receivedQuantity > 0)) {
    return fail(res, 400, "Goods have already been received against this purchase order");
  }

  order.status = PURCHASE_ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  await order.save();

  const saved = await loadOrder(req, order._id, { withItems: true });
  return sendSuccess(res, serializeOrder(saved, { withItems: true }));
};

// Only a draft can be deleted (an order that was issued is cancelled instead, so the record stays).
const deletePurchaseOrder = async (req, res) => {
  const order = await findByIdInOrg(PurchaseOrder, req, req.params.id);
  if (!order) return fail(res, 404, "Purchase order not found");

  if (order.status !== PURCHASE_ORDER_STATUS.DRAFT) {
    return fail(res, 400, "Only a draft purchase order can be deleted. Cancel it instead.");
  }

  await PurchaseOrder.deleteOne({ _id: order._id });

  return sendSuccess(res, { id: order._id });
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
};
