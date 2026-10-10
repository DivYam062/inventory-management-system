const Category = require("../models/Category");
const Product = require("../models/Product");
const { ENTITY_STATUS } = require("../config/constants");
const { sendSuccess, buildMeta } = require("../utils/response");
const { orgFilter, findByIdInOrg } = require("../utils/orgScope");

// Categories of the caller's organization. Every query is scoped by req.organizationId (taken from the
// token, never from the request). Permissions: category:view to read, category:create to add,
// category:edit to change, switch active/inactive or delete.

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const serializeCategory = (category, productCount) => ({
  id: category._id,
  name: category.name,
  description: category.description,
  status: category.status,
  productCount,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const isValidStatus = (status) => Object.values(ENTITY_STATUS).includes(status);

// How many products use each of the given categories.
const countProductsByCategory = async (categoryIds) => {
  const counts = await Product.aggregate([
    { $match: { category: { $in: categoryIds } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  return new Map(counts.map((c) => [String(c._id), c.count]));
};

// Returns an error message for a bad category name, otherwise null.
const nameError = async (req, name, exceptId) => {
  if (typeof name !== "string" || !name.trim()) return "Category name is required";
  if (name.trim().length > 100) return "Category name must be at most 100 characters";

  const duplicate = await Category.exists(
    orgFilter(req, {
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" },
      ...(exceptId && { _id: { $ne: exceptId } }),
    })
  );

  return duplicate ? "A category with this name already exists" : null;
};

const createCategory = async (req, res) => {
  const { name, description, status } = req.body;

  const nameProblem = await nameError(req, name);
  if (nameProblem) return fail(res, 400, nameProblem);

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  let category;
  try {
    category = await Category.create({
      organizationId: req.organizationId,
      name,
      description,
      status,
    });
  } catch (error) {
    if (error.code === 11000) return fail(res, 400, "A category with this name already exists");
    throw error;
  }

  return sendSuccess(res, serializeCategory(category, 0), { status: 201 });
};

const getCategories = async (req, res) => {
  const { search, status, page, limit } = req.query;

  const query = orgFilter(req);

  if (typeof search === "string" && search.trim()) {
    query.name = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  if (isValidStatus(status)) {
    query.status = status;
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [categories, total] = await Promise.all([
    Category.find(query)
      .collation({ locale: "en", strength: 2 })
      .sort({ name: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Category.countDocuments(query),
  ]);

  const productCounts = await countProductsByCategory(categories.map((c) => c._id));

  return sendSuccess(
    res,
    categories.map((c) => serializeCategory(c, productCounts.get(String(c._id)) || 0)),
    { meta: buildMeta({ page: pageNum, limit: limitNum, total }) }
  );
};

const getCategoryById = async (req, res) => {
  const category = await findByIdInOrg(Category, req, req.params.id);
  if (!category) return fail(res, 404, "Category not found");

  const productCounts = await countProductsByCategory([category._id]);

  return sendSuccess(res, serializeCategory(category, productCounts.get(String(category._id)) || 0));
};

const updateCategory = async (req, res) => {
  const { name, description, status } = req.body;

  const category = await findByIdInOrg(Category, req, req.params.id);
  if (!category) return fail(res, 404, "Category not found");

  if (name !== undefined) {
    const nameProblem = await nameError(req, name, category._id);
    if (nameProblem) return fail(res, 400, nameProblem);
  }

  if (status !== undefined && !isValidStatus(status)) {
    return fail(res, 400, "Invalid status. Status must be either 'active' or 'inactive'");
  }

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (status !== undefined) category.status = status;

  try {
    await category.save();
  } catch (error) {
    if (error.code === 11000) return fail(res, 400, "A category with this name already exists");
    throw error;
  }

  const productCounts = await countProductsByCategory([category._id]);

  return sendSuccess(res, serializeCategory(category, productCounts.get(String(category._id)) || 0));
};

const deleteCategory = async (req, res) => {
  const category = await findByIdInOrg(Category, req, req.params.id);
  if (!category) return fail(res, 404, "Category not found");

  // A category that products still use cannot be deleted.
  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    return fail(
      res,
      400,
      `Cannot delete this category. It is used by ${productCount} product${productCount === 1 ? "" : "s"}.`
    );
  }

  await Category.deleteOne({ _id: category._id });

  return sendSuccess(res, { id: category._id });
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
