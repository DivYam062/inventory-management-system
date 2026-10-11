const mongoose = require("mongoose");

const Inventory = require("../models/Inventory");
const InventoryTransaction = require("../models/InventoryTransaction");
const Category = require("../models/Category");
const Seller = require("../models/Seller");
const { INVENTORY_SOURCE } = InventoryTransaction;
const { increaseStock, decreaseStock } = require("../services/inventoryService");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter } = require("../utils/orgScope");
const { logAudit, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = require("../services/auditService");

// Total inventory of the caller's organization: the current stock of every product that has been put away,
// with manual increase / decrease and the full history of changes. Every query is scoped by req.organizationId
// (taken from the token, never from the request). Permissions: inventory:view to read, inventory:edit to
// increase or decrease stock.
//
// Stock gets here through Putaway (which creates a product's row). From then on it changes only through
// InventoryTransactions: putaway adds, and a manual adjustment adds or removes with a required reason. The
// quantity never goes below zero, and the history is never edited or deleted.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const MAX_QUANTITY = 1_000_000_000;
const MAX_REASON = 200;
const ADJUSTMENT_TYPES = ["increase", "decrease"];

const roundTo = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const stockStatus = (quantity) => (quantity > 0 ? "in_stock" : "out_of_stock");

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

// One stock row: { id, product: {...}, quantity, status, updatedAt }.
const serializeRow = (row, categories, sellers) => {
  const product = row.product;
  const category = categories.get(String(product.categoryId));
  const seller = sellers.get(String(product.sellerId));

  return {
    id: row._id,
    product: {
      id: product._id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      image: product.image,
      unit: product.unit,
      status: product.status,
      category: category ? { id: category._id, name: category.name } : null,
      seller: seller ? { id: seller._id, name: seller.name } : null,
    },
    quantity: roundTo(row.quantity, 3),
    status: stockStatus(row.quantity),
    updatedAt: row.updatedAt,
  };
};

// Category and seller names for a set of products.
const loadNames = async (req, products) => {
  const [categories, sellers] = await Promise.all([
    Category.find(orgFilter(req, { _id: { $in: [...new Set(products.map((p) => String(p.categoryId)))] } })).select("name"),
    Seller.find(orgFilter(req, { _id: { $in: [...new Set(products.map((p) => String(p.sellerId)))] } })).select("name"),
  ]);

  return {
    categories: new Map(categories.map((c) => [String(c._id), c])),
    sellers: new Map(sellers.map((s) => [String(s._id), s])),
  };
};

// Stock rows joined with their product, filtered and sorted by product name.
const buildListPipeline = (req, { search, categoryId, sellerId, stock }) => {
  const productMatch = {};

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    productMatch.$or = [{ "product.name": pattern }, { "product.sku": pattern }, { "product.barcode": pattern }];
  }
  if (typeof categoryId === "string" && mongoose.isValidObjectId(categoryId)) productMatch["product.categoryId"] = toObjectId(categoryId);
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) productMatch["product.sellerId"] = toObjectId(sellerId);
  if (stock === "in_stock") productMatch.quantity = { $gt: 0 };
  if (stock === "out_of_stock") productMatch.quantity = { $lte: 0 };

  return [
    { $match: { organizationId: toObjectId(req.organizationId) } },
    { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $match: productMatch },
  ];
};

const getInventory = async (req, res) => {
  const { page, limit } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [result] = await Inventory.aggregate([
    ...buildListPipeline(req, req.query),
    { $sort: { "product.name": 1, _id: 1 } },
    {
      $facet: {
        rows: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
        total: [{ $count: "count" }],
      },
    },
  ]).collation({ locale: "en", strength: 2 });

  const rows = result.rows;
  const total = result.total[0]?.count ?? 0;
  const { categories, sellers } = await loadNames(req, rows.map((row) => row.product));

  return sendSuccess(res, rows.map((row) => serializeRow(row, categories, sellers)), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

// How many products have stock records, and how many of them are in / out of stock (for the page's cards).
const getSummary = async (req, res) => {
  const [counts] = await Inventory.aggregate([
    { $match: { organizationId: toObjectId(req.organizationId) } },
    {
      $group: {
        _id: null,
        products: { $sum: 1 },
        inStock: { $sum: { $cond: [{ $gt: ["$quantity", 0] }, 1, 0] } },
      },
    },
  ]);

  const products = counts?.products ?? 0;
  const inStock = counts?.inStock ?? 0;

  return sendSuccess(res, { products, inStock, outOfStock: products - inStock });
};

// The stock row of one product (by product id), or null.
const findStock = async (req, productId) => {
  if (!mongoose.isValidObjectId(productId)) return null;

  const [row] = await Inventory.aggregate([
    { $match: { organizationId: toObjectId(req.organizationId), productId: toObjectId(productId) } },
    { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
  ]);

  if (!row) return null;

  const { categories, sellers } = await loadNames(req, [row.product]);
  return serializeRow(row, categories, sellers);
};

const getStockByProduct = async (req, res) => {
  const stock = await findStock(req, req.params.productId);
  if (!stock) return fail(res, 404, "No stock found for this product");

  return sendSuccess(res, stock);
};

const serializeTransaction = (transaction) => {
  const user = transaction.performedBy && transaction.performedBy._id ? transaction.performedBy : null;

  return {
    id: transaction._id,
    previousQty: transaction.previousQty,
    changedQty: transaction.changedQty,
    newQty: transaction.newQty,
    source: transaction.source,
    reason: transaction.reason,
    refNumber: transaction.refNumber,
    performedBy: user ? { id: user._id, name: user.name } : null,
    createdAt: transaction.createdAt,
  };
};

// Every change to one product's stock, newest first.
const getTransactions = async (req, res) => {
  const stock = await findStock(req, req.params.productId);
  if (!stock) return fail(res, 404, "No stock found for this product");

  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  const query = orgFilter(req, { productId: req.params.productId });

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find(query)
      .populate("performedBy", "name")
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    InventoryTransaction.countDocuments(query),
  ]);

  return sendSuccess(res, transactions.map(serializeTransaction), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

// Increase or decrease a product's stock by hand. A reason is required (it is part of the history). A decrease
// cannot take more than is in stock.
const adjustStock = async (req, res) => {
  const { type, reason } = req.body;

  if (!ADJUSTMENT_TYPES.includes(type)) return fail(res, 400, "Choose whether to increase or decrease the stock");

  const quantity = Number(req.body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
    return fail(res, 400, "Quantity must be greater than 0");
  }
  const rounded = roundTo(quantity, 3);
  if (rounded <= 0) return fail(res, 400, "Quantity must be greater than 0");

  if (typeof reason !== "string" || !reason.trim()) return fail(res, 400, "A reason is required");
  if (reason.trim().length > MAX_REASON) return fail(res, 400, `Reason must be at most ${MAX_REASON} characters`);

  const stock = await findStock(req, req.params.productId);
  if (!stock) return fail(res, 404, "No stock found for this product");

  const change = {
    organizationId: req.organizationId, // always from the caller
    productId: stock.product.id,
    quantity: rounded,
    source: INVENTORY_SOURCE.MANUAL_ADJUSTMENT,
    reason: reason.trim(),
    performedBy: req.user._id,
  };

  const transaction = type === "increase" ? await increaseStock(change) : await decreaseStock(change);

  if (!transaction) {
    // Read again: the stock may have changed since it was first read.
    const current = await findStock(req, req.params.productId);
    return fail(res, 400, `Cannot decrease by ${rounded} ${stock.product.unit}: only ${current?.quantity ?? 0} ${stock.product.unit} in stock`);
  }

  await transaction.populate("performedBy", "name");

  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.INVENTORY,
    entity: { id: stock.product.id, number: `${stock.product.name} (${stock.product.sku})` },
    action: type === "increase" ? AUDIT_ACTIONS.STOCK_INCREASED : AUDIT_ACTIONS.STOCK_DECREASED,
    summary: `Stock ${type === "increase" ? "+" : "-"}${rounded} ${stock.product.unit} by hand (${transaction.previousQty} → ${transaction.newQty}): ${reason.trim()}`,
    meta: { previousQty: transaction.previousQty, changedQty: transaction.changedQty, newQty: transaction.newQty, reason: reason.trim() },
  });

  const updated = await findStock(req, req.params.productId);
  return sendSuccess(res, { stock: updated, transaction: serializeTransaction(transaction) });
};

module.exports = { getInventory, getSummary, getStockByProduct, getTransactions, adjustStock };
