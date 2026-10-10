const Seller = require("../models/Seller");
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

const serializeSeller = (seller) => ({
  id: seller._id,
  name: seller.name,
  email: seller.email,
  phone: seller.phone,
  address: seller.address,
  status: seller.status,
  createdAt: seller.createdAt,
  updatedAt: seller.updatedAt,
});

const isValidStatus = (status) => Object.values(ENTITY_STATUS).includes(status);

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

  return sendSuccess(res, sellers.map(serializeSeller), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total }),
  });
};

const getSellerById = async (req, res) => {
  const seller = await findByIdInOrg(Seller, req, req.params.id);
  if (!seller) return fail(res, 404, "Seller not found");

  return sendSuccess(res, serializeSeller(seller));
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

  return sendSuccess(res, serializeSeller(seller));
};

// A seller that other records depend on (suppliers, products, purchase orders) must not be deleted:
// each of those modules adds its own check here when it is built.
const deleteSeller = async (req, res) => {
  const seller = await findByIdInOrg(Seller, req, req.params.id);
  if (!seller) return fail(res, 404, "Seller not found");

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
