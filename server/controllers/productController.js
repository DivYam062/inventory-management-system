const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");
const Seller = require("../models/Seller");
const PurchaseOrder = require("../models/PurchaseOrder");
const { ENTITY_STATUS } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");
const { deleteUploadedFile } = require("../middleware/uploadMiddleware");
const { getConfiguration } = require("../services/configurationService");

// Products of the caller's organization. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permissions: product:view to read, product:create to add,
// product:edit to change, switch active/inactive or delete.
//
// A product belongs to a Category and is made under a Seller; both are required and must exist in the
// caller's organization (and be active when first chosen). The image is optional and sent as multipart
// form data (field "image"); every failure path removes an image that was uploaded for the request.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const IMAGE_PUBLIC_PATH = "/uploads/products/";
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const MAX_PRICE = 1_000_000_000;

const uploadedImagePath = (req) => (req.file ? `${IMAGE_PUBLIC_PATH}${req.file.filename}` : undefined);

const isValidStatus = (status) => Object.values(ENTITY_STATUS).includes(status);

const serializeProduct = (product) => {
  // categoryId / sellerId are populated ({ _id, name, status }).
  const category = product.categoryId && product.categoryId._id ? product.categoryId : null;
  const seller = product.sellerId && product.sellerId._id ? product.sellerId : null;

  return {
    id: product._id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    price: product.price,
    currency: product.currency,
    unit: product.unit,
    image: product.image,
    status: product.status,
    category: category ? { id: category._id, name: category.name, status: category.status } : null,
    seller: seller ? { id: seller._id, name: seller.name, status: seller.status } : null,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const populateRefs = (query) => query.populate("categoryId", "name status").populate("sellerId", "name status");

const nameError = (name) => {
  if (typeof name !== "string" || !name.trim()) return "Product name is required";
  if (name.trim().length > 150) return "Product name must be at most 150 characters";
  return null;
};

const skuError = (sku) => {
  if (typeof sku !== "string" || !sku.trim()) return "SKU is required";
  if (sku.trim().length > 50) return "SKU must be at most 50 characters";
  if (!SKU_PATTERN.test(sku.trim())) return "SKU can only contain letters, numbers and . _ / -";
  return null;
};

// Multipart fields arrive as strings. Empty / missing means "no price". Returns { value } or { error }.
const parsePrice = (price) => {
  if (price === undefined || price === null || price === "") return { value: undefined };

  const value = Number(price);
  if (!Number.isFinite(value) || value < 0 || value > MAX_PRICE) {
    return { error: "Price must be a number of 0 or more" };
  }

  return { value: Math.round(value * 100) / 100 };
};

// Currency / unit codes are stored uppercase.
const normalizeCode = (code) => (typeof code === "string" ? code.trim().toUpperCase() : code);

const currencyError = (currency) => (typeof currency !== "string" || !currency.trim() ? "Invalid currency" : null);

const unitError = (unit) => {
  if (typeof unit !== "string" || !unit) return "Unit of measurement is required";
  return null;
};

// A currency / unit that is being newly chosen must be enabled in the organization's configuration.
// Returns an error message or null.
const enabledError = async (req, currency, unit) => {
  const configuration = await getConfiguration(req.organizationId);
  if (currency && !configuration.currencies.includes(currency)) {
    return `Currency ${currency} is not enabled. Enable it in Configuration first.`;
  }
  if (unit && !configuration.units.includes(unit)) {
    return `Unit ${unit} is not enabled. Enable it in Configuration first.`;
  }
  return null;
};

const skuTaken = (req, sku, exceptId) =>
  Product.exists(
    orgFilter(req, {
      sku: sku.trim().toUpperCase(),
      ...(exceptId && { _id: { $ne: exceptId } }),
    })
  );

// A category / seller a product is being linked to must exist in the caller's organization and be
// active. Returns { doc } or { error }.
const findActiveReference = async (Model, label, req, id) => {
  if (!mongoose.isValidObjectId(id)) return { error: `${label} is required` };

  const doc = await Model.findOne(orgFilter(req, { _id: id }));
  if (!doc) return { error: `${label} not found` };
  if (doc.status !== ENTITY_STATUS.ACTIVE) return { error: `${label} "${doc.name}" is inactive` };

  return { doc };
};

const saveProduct = async (res, product) => {
  try {
    await product.save();
    return true;
  } catch (error) {
    if (error.code === 11000) {
      fail(res, 400, "A product with this SKU already exists");
      return false;
    }
    throw error;
  }
};

const createProduct = async (req, res) => {
  const { name, sku, description, price, status, categoryId, sellerId } = req.body;
  const currency = normalizeCode(req.body.currency);
  const unit = normalizeCode(req.body.unit);
  const image = uploadedImagePath(req);

  // The image is stored by multer before this runs, so every failure path must remove it again.
  const reject = (statusCode, message) => {
    deleteUploadedFile(image);
    return fail(res, statusCode, message);
  };

  const problem = nameError(name) || skuError(sku);
  if (problem) return reject(400, problem);

  const parsedPrice = parsePrice(price);
  if (parsedPrice.error) return reject(400, parsedPrice.error);

  const unitProblem = unitError(unit);
  if (unitProblem) return reject(400, unitProblem);

  // A price needs a currency; without a price the currency is ignored.
  const hasPrice = parsedPrice.value !== undefined;
  if (hasPrice) {
    if (!currency) return reject(400, "Currency is required when a price is set");
    const problem = currencyError(currency);
    if (problem) return reject(400, problem);
  }

  if (description !== undefined && typeof description === "string" && description.trim().length > 1000) {
    return reject(400, "Description must be at most 1000 characters");
  }

  if (status !== undefined && !isValidStatus(status)) {
    return reject(400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  const notEnabled = await enabledError(req, hasPrice ? currency : null, unit);
  if (notEnabled) return reject(400, notEnabled);

  if (await skuTaken(req, sku)) return reject(400, "A product with this SKU already exists");

  const category = await findActiveReference(Category, "Category", req, categoryId);
  if (category.error) return reject(400, category.error);

  const seller = await findActiveReference(Seller, "Seller", req, sellerId);
  if (seller.error) return reject(400, seller.error);

  // organizationId always comes from the caller.
  const product = new Product({
    organizationId: req.organizationId,
    name,
    sku,
    description: description || undefined,
    categoryId: category.doc._id,
    sellerId: seller.doc._id,
    price: parsedPrice.value,
    currency: hasPrice ? currency : undefined,
    unit,
    image: image ?? null,
    status,
  });

  try {
    if (!(await saveProduct(res, product))) {
      deleteUploadedFile(image);
      return;
    }
  } catch (error) {
    deleteUploadedFile(image);
    throw error;
  }

  await product.populate([
    { path: "categoryId", select: "name status" },
    { path: "sellerId", select: "name status" },
  ]);

  return sendSuccess(res, serializeProduct(product), { status: 201 });
};

const getProducts = async (req, res) => {
  const { search, status, categoryId, sellerId, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { sku: pattern }];
  }

  if (isValidStatus(status)) {
    query.status = status;
  }

  if (typeof categoryId === "string" && mongoose.isValidObjectId(categoryId)) {
    query.categoryId = categoryId;
  }

  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) {
    query.sellerId = sellerId;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [products, total] = await Promise.all([
    populateRefs(Product.find(query))
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Product.countDocuments(query),
  ]);

  return sendSuccess(res, products.map(serializeProduct), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getProductById = async (req, res) => {
  const product = await populateRefs(findByIdInOrg(Product, req, req.params.id));
  if (!product) return fail(res, 404, "Product not found");

  return sendSuccess(res, serializeProduct(product));
};

const updateProduct = async (req, res) => {
  const { name, sku, description, price, status, categoryId, sellerId, removeImage } = req.body;
  const currency = normalizeCode(req.body.currency);
  const unit = normalizeCode(req.body.unit);
  const newImage = uploadedImagePath(req);

  const reject = (statusCode, message) => {
    deleteUploadedFile(newImage);
    return fail(res, statusCode, message);
  };

  const product = await populateRefs(findByIdInOrg(Product, req, req.params.id));
  if (!product) return reject(404, "Product not found");

  if (name !== undefined) {
    const problem = nameError(name);
    if (problem) return reject(400, problem);
  }

  if (sku !== undefined) {
    const problem = skuError(sku);
    if (problem) return reject(400, problem);
    if (await skuTaken(req, sku, product._id)) return reject(400, "A product with this SKU already exists");
  }

  let parsedPrice;
  if (price !== undefined) {
    parsedPrice = parsePrice(price);
    if (parsedPrice.error) return reject(400, parsedPrice.error);
  }

  if (unit !== undefined) {
    const problem = unitError(unit);
    if (problem) return reject(400, problem);
  }

  if (currency !== undefined && currency !== "") {
    const problem = currencyError(currency);
    if (problem) return reject(400, problem);
  }

  // Only a newly chosen currency / unit has to be enabled; the saved ones may have been disabled later.
  const notEnabled = await enabledError(
    req,
    currency && currency !== product.currency ? currency : null,
    unit && unit !== product.unit ? unit : null
  );
  if (notEnabled) return reject(400, notEnabled);

  // The resulting product must not have a price without a currency.
  const finalPrice = parsedPrice ? parsedPrice.value : product.price;
  const finalCurrency = currency !== undefined ? currency || undefined : product.currency;
  if (finalPrice !== undefined && finalPrice !== null && !finalCurrency) {
    return reject(400, "Currency is required when a price is set");
  }

  if (description !== undefined && typeof description === "string" && description.trim().length > 1000) {
    return reject(400, "Description must be at most 1000 characters");
  }

  if (status !== undefined && !isValidStatus(status)) {
    return reject(400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  // Category / seller are only validated when they actually change, so a product whose category or seller
  // was deactivated later can still be edited without touching them.
  let newCategory;
  if (categoryId !== undefined && String(categoryId) !== String(product.categoryId._id)) {
    const found = await findActiveReference(Category, "Category", req, categoryId);
    if (found.error) return reject(400, found.error);
    newCategory = found.doc;
  }

  let newSeller;
  if (sellerId !== undefined && String(sellerId) !== String(product.sellerId._id)) {
    const found = await findActiveReference(Seller, "Seller", req, sellerId);
    if (found.error) return reject(400, found.error);
    newSeller = found.doc;

    // A purchase order's products must all be made under the order's seller, so a product on an order
    // cannot move to another seller.
    if (await PurchaseOrder.exists({ "items.productId": product._id })) {
      return reject(400, "This product is on a purchase order, so its seller cannot be changed");
    }
  }

  if (name !== undefined) product.name = name;
  if (sku !== undefined) product.sku = sku;
  if (description !== undefined) product.description = description || undefined;
  if (parsedPrice) product.price = parsedPrice.value;
  if (unit !== undefined) product.unit = unit;
  if (parsedPrice || currency !== undefined) {
    product.currency = finalPrice === undefined || finalPrice === null ? undefined : finalCurrency;
  }
  if (status !== undefined) product.status = status;
  if (newCategory) product.categoryId = newCategory._id;
  if (newSeller) product.sellerId = newSeller._id;

  // A new upload replaces the image; removeImage clears it. The old file is deleted after the save.
  const previousImage = product.image;
  let imageChanged = false;

  if (newImage) {
    product.image = newImage;
    imageChanged = true;
  } else if (String(removeImage) === "true" && previousImage) {
    product.image = null;
    imageChanged = true;
  }

  try {
    if (!(await saveProduct(res, product))) {
      deleteUploadedFile(newImage);
      return;
    }
  } catch (error) {
    deleteUploadedFile(newImage);
    throw error;
  }

  if (imageChanged) deleteUploadedFile(previousImage);

  await product.populate([
    { path: "categoryId", select: "name status" },
    { path: "sellerId", select: "name status" },
  ]);

  return sendSuccess(res, serializeProduct(product));
};

const deleteProduct = async (req, res) => {
  const product = await findByIdInOrg(Product, req, req.params.id);
  if (!product) return fail(res, 404, "Product not found");

  // GRNs and inventory that reference this product will need to be checked here when those modules are built.
  const orderCount = await PurchaseOrder.countDocuments({ "items.productId": product._id });
  if (orderCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this product. It is on ${orderCount} purchase order${orderCount === 1 ? "" : "s"}.`
    );
  }

  await Product.deleteOne({ _id: product._id });
  deleteUploadedFile(product.image);

  return sendSuccess(res, { id: product._id });
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
