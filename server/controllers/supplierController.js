const mongoose = require("mongoose");

const Supplier = require("../models/Supplier");
const Seller = require("../models/Seller");
const PurchaseOrder = require("../models/PurchaseOrder");
const GateEntry = require("../models/GateEntry");
const Grn = require("../models/Grn");
const { PURCHASE_ORDER_STATUS } = PurchaseOrder;
const { ENTITY_STATUS } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// Suppliers of the caller's organization. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permissions: supplier:view to read, supplier:create to add,
// supplier:edit to change, assign / unassign, switch active/inactive or delete.
//
// A supplier works under at most one seller at a time. It can be created unassigned or assigned right
// away, and moved with assign / unassign; the seller is NOT changed through the normal edit.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const PHONE_PATTERN = /^[\d+\-\s()]*$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const SELLER_FIELDS = "name status";

const serializeSupplier = (supplier) => {
  // sellerId is populated ({ _id, name, status }) when the supplier is assigned.
  const seller = supplier.sellerId && supplier.sellerId._id ? supplier.sellerId : null;

  return {
    id: supplier._id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    status: supplier.status,
    seller: seller ? { id: seller._id, name: seller.name, status: seller.status } : null,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
};

const isValidStatus = (status) => Object.values(ENTITY_STATUS).includes(status);

const nameError = (name) => {
  if (typeof name !== "string" || !name.trim()) return "Supplier name is required";
  if (name.trim().length > 100) return "Supplier name must be at most 100 characters";
  return null;
};

const emailError = (email) => {
  if (typeof email !== "string" || !email.trim()) return "Supplier email is required";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address";
  return null;
};

const phoneError = (phone) => {
  if (phone === undefined || phone === null || phone === "") return null;
  if (typeof phone !== "string" || phone.length > 20 || !PHONE_PATTERN.test(phone)) {
    return "Phone number can only contain digits, spaces, + - ( ) and be at most 20 characters";
  }
  return null;
};

// Another supplier of this organization already uses the email (emails are stored lowercased).
const emailTaken = (req, email, exceptId) =>
  Supplier.exists(
    orgFilter(req, {
      email: email.trim().toLowerCase(),
      ...(exceptId && { _id: { $ne: exceptId } }),
    })
  );

// Finds a seller a supplier may be assigned to: it must exist in the caller's organization and be active.
// Returns { seller } or { error }.
const findAssignableSeller = async (req, sellerId) => {
  if (!mongoose.isValidObjectId(sellerId)) return { error: "Seller not found" };

  const seller = await Seller.findOne(orgFilter(req, { _id: sellerId }));
  if (!seller) return { error: "Seller not found" };
  if (seller.status !== ENTITY_STATUS.ACTIVE) return { error: `Seller "${seller.name}" is inactive` };

  return { seller };
};

const populateSeller = (query) => query.populate("sellerId", SELLER_FIELDS);

const saveSupplier = async (res, supplier) => {
  try {
    await supplier.save();
    return true;
  } catch (error) {
    if (error.code === 11000) {
      fail(res, 400, "A supplier with this email already exists");
      return false;
    }
    throw error;
  }
};

const createSupplier = async (req, res) => {
  const { name, email, phone, status, sellerId } = req.body;

  const problem = nameError(name) || emailError(email) || phoneError(phone);
  if (problem) return fail(res, 400, problem);

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  if (await emailTaken(req, email)) {
    return fail(res, 400, "A supplier with this email already exists");
  }

  // Optionally assign to a seller right away.
  let seller = null;
  if (sellerId !== undefined && sellerId !== null && sellerId !== "") {
    const found = await findAssignableSeller(req, sellerId);
    if (found.error) return fail(res, 400, found.error);
    seller = found.seller;
  }

  // organizationId always comes from the caller.
  const supplier = new Supplier({
    organizationId: req.organizationId,
    name,
    email,
    phone: phone || undefined,
    sellerId: seller ? seller._id : null,
    status,
  });

  if (!(await saveSupplier(res, supplier))) return;

  await supplier.populate("sellerId", SELLER_FIELDS);

  return sendSuccess(res, serializeSupplier(supplier), { status: 201 });
};

const getSuppliers = async (req, res) => {
  const { search, status, sellerId, assigned, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    const pattern = { $regex: escapeRegex(search.trim()), $options: "i" };
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  if (isValidStatus(status)) {
    query.status = status;
  }

  // Filter by seller, or by whether the supplier works under any seller at all.
  if (typeof sellerId === "string" && mongoose.isValidObjectId(sellerId)) {
    query.sellerId = sellerId;
  } else if (assigned === "true") {
    query.sellerId = { $ne: null };
  } else if (assigned === "false") {
    query.sellerId = null;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [suppliers, total] = await Promise.all([
    populateSeller(Supplier.find(query))
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Supplier.countDocuments(query),
  ]);

  return sendSuccess(res, suppliers.map(serializeSupplier), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getSupplierById = async (req, res) => {
  const supplier = await populateSeller(findByIdInOrg(Supplier, req, req.params.id));
  if (!supplier) return fail(res, 404, "Supplier not found");

  return sendSuccess(res, serializeSupplier(supplier));
};

const updateSupplier = async (req, res) => {
  const { name, email, phone, status, sellerId } = req.body;

  const supplier = await populateSeller(findByIdInOrg(Supplier, req, req.params.id));
  if (!supplier) return fail(res, 404, "Supplier not found");

  // The seller is changed only through assign / unassign (a supplier works under one seller at a time).
  if (sellerId !== undefined) {
    const current = supplier.sellerId ? String(supplier.sellerId._id) : "";
    if (String(sellerId ?? "") !== current) {
      return fail(res, 400, "Use assign / unassign to change the seller of a supplier");
    }
  }

  if (name !== undefined) {
    const problem = nameError(name);
    if (problem) return fail(res, 400, problem);
  }

  if (email !== undefined) {
    const problem = emailError(email);
    if (problem) return fail(res, 400, problem);
    if (await emailTaken(req, email, supplier._id)) {
      return fail(res, 400, "A supplier with this email already exists");
    }
  }

  const phoneProblem = phoneError(phone);
  if (phoneProblem) return fail(res, 400, phoneProblem);

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  if (name !== undefined) supplier.name = name;
  if (email !== undefined) supplier.email = email;
  if (phone !== undefined) supplier.phone = phone || undefined;
  if (status !== undefined) supplier.status = status;

  if (!(await saveSupplier(res, supplier))) return;

  return sendSuccess(res, serializeSupplier(supplier));
};

// Puts an unassigned supplier under a seller. A supplier already working under a seller must be
// unassigned first: they cannot join a second seller.
const assignSupplier = async (req, res) => {
  const supplier = await populateSeller(findByIdInOrg(Supplier, req, req.params.id));
  if (!supplier) return fail(res, 404, "Supplier not found");

  if (supplier.sellerId) {
    return fail(
      res,
      400,
      `${supplier.name} already works under "${supplier.sellerId.name}". Unassign the supplier first.`
    );
  }

  const found = await findAssignableSeller(req, req.body.sellerId);
  if (found.error) return fail(res, 400, found.error);

  supplier.sellerId = found.seller._id;
  await supplier.save();
  await supplier.populate("sellerId", SELLER_FIELDS);

  return sendSuccess(res, serializeSupplier(supplier));
};

// Takes a supplier out of their seller, so they can be assigned to another one.
const unassignSupplier = async (req, res) => {
  const supplier = await populateSeller(findByIdInOrg(Supplier, req, req.params.id));
  if (!supplier) return fail(res, 404, "Supplier not found");

  if (!supplier.sellerId) {
    return fail(res, 400, `${supplier.name} is not assigned to a seller`);
  }

  // A supplier with an open purchase order (draft, issued or partly received) or a pending gate entry stays
  // with its seller.
  const openOrders = await PurchaseOrder.countDocuments({
    supplierId: supplier._id,
    status: { $in: [PURCHASE_ORDER_STATUS.DRAFT, PURCHASE_ORDER_STATUS.ISSUED, PURCHASE_ORDER_STATUS.PARTIALLY_RECEIVED] },
  });
  if (openOrders > 0) {
    return fail(
      res,
      400,
      `Cannot unassign ${supplier.name}: ${openOrders} open purchase order${openOrders === 1 ? "" : "s"} use this supplier.`
    );
  }

  const pendingEntries = await GateEntry.countDocuments({ supplierId: supplier._id, status: "pending" });
  if (pendingEntries > 0) {
    return fail(
      res,
      400,
      `Cannot unassign ${supplier.name}: ${pendingEntries} pending gate entr${pendingEntries === 1 ? "y uses" : "ies use"} this supplier.`
    );
  }

  const pendingGrns = await Grn.countDocuments({ supplierId: supplier._id, status: "pending_inspection" });
  if (pendingGrns > 0) {
    return fail(
      res,
      400,
      `Cannot unassign ${supplier.name}: ${pendingGrns} GRN${pendingGrns === 1 ? " is" : "s are"} waiting for inspection.`
    );
  }

  supplier.sellerId = null;
  await supplier.save();

  return sendSuccess(res, serializeSupplier(supplier));
};

const deleteSupplier = async (req, res) => {
  const supplier = await findByIdInOrg(Supplier, req, req.params.id);
  if (!supplier) return fail(res, 404, "Supplier not found");

  const entryCount = await GateEntry.countDocuments({ supplierId: supplier._id });
  if (entryCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this supplier. ${entryCount} gate entr${entryCount === 1 ? "y was" : "ies were"} recorded for them.`
    );
  }

  const grnCount = await Grn.countDocuments({ supplierId: supplier._id });
  if (grnCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this supplier. ${grnCount} GRN${grnCount === 1 ? " was" : "s were"} received from them.`
    );
  }

  const orderCount = await PurchaseOrder.countDocuments({ supplierId: supplier._id });
  if (orderCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this supplier. ${orderCount} purchase order${orderCount === 1 ? " was" : "s were"} raised through them.`
    );
  }

  await Supplier.deleteOne({ _id: supplier._id });

  return sendSuccess(res, { id: supplier._id });
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  assignSupplier,
  unassignSupplier,
  deleteSupplier,
};
