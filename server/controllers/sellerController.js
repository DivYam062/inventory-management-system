const Seller = require("../models/Seller");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const GateEntry = require("../models/GateEntry");
const { ENTITY_STATUS } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// Sellers of the caller's organization. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permissions: seller:view to read, seller:create to add, seller:edit to
// change, switch active/inactive or delete.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const PHONE_PATTERN = /^[\d+\-\s()]*$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// counts: { supplierCount, productCount } - suppliers working under the seller and products made under it.
const serializeSeller = (seller, counts = {}) => ({
  id: seller._id,
  name: seller.name,
  email: seller.email,
  phone: seller.phone,
  address: seller.address,
  status: seller.status,
  supplierCount: counts.supplierCount || 0,
  productCount: counts.productCount || 0,
  createdAt: seller.createdAt,
  updatedAt: seller.updatedAt,
});

const isValidStatus = (status) => Object.values(ENTITY_STATUS).includes(status);

// How many suppliers work under, and products are made under, each of the given sellers.
// Returns a Map of seller id -> { supplierCount, productCount }.
const countSellerRelations = async (sellerIds) => {
  const groupBySeller = (Model) =>
    Model.aggregate([
      { $match: { sellerId: { $in: sellerIds } } },
      { $group: { _id: "$sellerId", count: { $sum: 1 } } },
    ]);

  const [suppliers, products] = await Promise.all([groupBySeller(Supplier), groupBySeller(Product)]);

  const result = new Map();
  suppliers.forEach((c) => result.set(String(c._id), { supplierCount: c.count, productCount: 0 }));
  products.forEach((c) => {
    const entry = result.get(String(c._id)) || { supplierCount: 0, productCount: 0 };
    entry.productCount = c.count;
    result.set(String(c._id), entry);
  });
  return result;
};

// Returns an error message for a bad seller name, otherwise null.
const nameError = async (req, name, exceptId) => {
  if (typeof name !== "string" || !name.trim()) return "Seller name is required";
  if (name.trim().length > 100) return "Seller name must be at most 100 characters";

  const duplicate = await Seller.exists(
    orgFilter(req, {
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      ...(exceptId && { _id: { $ne: exceptId } }),
    })
  );

  return duplicate ? "A seller with this name already exists" : null;
};

// Returns an error message for a bad seller email, otherwise null. The email is required.
const emailError = (email) => {
  if (typeof email !== "string" || !email.trim()) return "Seller email is required";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address";
  return null;
};

// Returns an error message for a bad phone number, otherwise null. Empty / missing is fine.
const phoneError = (phone) => {
  if (phone === undefined || phone === null || phone === "") return null;
  if (typeof phone !== "string" || phone.length > 20 || !PHONE_PATTERN.test(phone)) {
    return "Phone number can only contain digits, spaces, + - ( ) and be at most 20 characters";
  }
  return null;
};

const saveSeller = async (res, seller) => {
  try {
    await seller.save();
    return true;
  } catch (error) {
    if (error.code === 11000) {
      fail(res, 400, "A seller with this name already exists");
      return false;
    }
    throw error;
  }
};

const createSeller = async (req, res) => {
  const { name, email, phone, address, status } = req.body;

  const nameProblem = await nameError(req, name);
  if (nameProblem) return fail(res, 400, nameProblem);

  const emailProblem = emailError(email);
  if (emailProblem) return fail(res, 400, emailProblem);

  const phoneProblem = phoneError(phone);
  if (phoneProblem) return fail(res, 400, phoneProblem);

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  // organizationId always comes from the caller.
  const seller = new Seller({
    organizationId: req.organizationId,
    name,
    email,
    phone: phone || undefined,
    address: address || undefined,
    status,
  });

  if (!(await saveSeller(res, seller))) return;

  return sendSuccess(res, serializeSeller(seller), { status: 201 });
};

const getSellers = async (req, res) => {
  const { search, status, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  if (isValidStatus(status)) {
    query.status = status;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [sellers, total] = await Promise.all([
    Seller.find(query)
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Seller.countDocuments(query),
  ]);

  const relations = await countSellerRelations(sellers.map((s) => s._id));

  return sendSuccess(res, sellers.map((s) => serializeSeller(s, relations.get(String(s._id)))), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getSellerById = async (req, res) => {
  const seller = await findByIdInOrg(Seller, req, req.params.id);
  if (!seller) return fail(res, 404, "Seller not found");

  const relations = await countSellerRelations([seller._id]);

  return sendSuccess(res, serializeSeller(seller, relations.get(String(seller._id))));
};

const updateSeller = async (req, res) => {
  const { name, email, phone, address, status } = req.body;

  const seller = await findByIdInOrg(Seller, req, req.params.id);
  if (!seller) return fail(res, 404, "Seller not found");

  if (name !== undefined) {
    const nameProblem = await nameError(req, name, seller._id);
    if (nameProblem) return fail(res, 400, nameProblem);
  }

  // The email can be changed but never cleared.
  if (email !== undefined) {
    const emailProblem = emailError(email);
    if (emailProblem) return fail(res, 400, emailProblem);
  }

  const phoneProblem = phoneError(phone);
  if (phoneProblem) return fail(res, 400, phoneProblem);

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  if (name !== undefined) seller.name = name;
  if (email !== undefined) seller.email = email;
  if (phone !== undefined) seller.phone = phone || undefined;
  if (address !== undefined) seller.address = address || undefined;
  if (status !== undefined) seller.status = status;

  if (!(await saveSeller(res, seller))) return;

  const relations = await countSellerRelations([seller._id]);

  return sendSuccess(res, serializeSeller(seller, relations.get(String(seller._id))));
};

// A seller that other records depend on must not be deleted. Suppliers, products, purchase orders and gate entries
// are checked here; GRNs add their own check when that module is built.
const deleteSeller = async (req, res) => {
  const seller = await findByIdInOrg(Seller, req, req.params.id);
  if (!seller) return fail(res, 404, "Seller not found");

  const supplierCount = await Supplier.countDocuments({ sellerId: seller._id });
  if (supplierCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this seller. ${supplierCount} supplier${supplierCount === 1 ? " works" : "s work"} under it. Unassign or delete them first.`
    );
  }

  const productCount = await Product.countDocuments({ sellerId: seller._id });
  if (productCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this seller. ${productCount} product${productCount === 1 ? " is" : "s are"} made under it. Delete or move them first.`
    );
  }

  const orderCount = await PurchaseOrder.countDocuments({ sellerId: seller._id });
  if (orderCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this seller. ${orderCount} purchase order${orderCount === 1 ? " was" : "s were"} raised to it.`
    );
  }

  const entryCount = await GateEntry.countDocuments({ sellerId: seller._id });
  if (entryCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this seller. ${entryCount} gate entr${entryCount === 1 ? "y was" : "ies were"} recorded for it.`
    );
  }

  await Seller.deleteOne({ _id: seller._id });

  return sendSuccess(res, { id: seller._id });
};

module.exports = {
  createSeller,
  getSellers,
  getSellerById,
  updateSeller,
  deleteSeller,
};
