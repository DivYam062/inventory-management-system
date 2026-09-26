const Category = require("../models/Category");
const Product = require("../models/Product");

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }

    // Create new category
    const category = await Category.create({
      name,
      description,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all categories (supports search, status filter, and optional pagination)
const getCategories = async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;

    const query = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.name = { $regex: escapedSearch, $options: "i" };
    }

    if (status) {
      query.status = status;
    }

    // Pagination only activates when the caller explicitly asks for it, so
    // existing callers that fetch the full list (e.g. product forms/filters) are unaffected.
    const shouldPaginate = page !== undefined || limit !== undefined;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

    let categoriesQuery = Category.find(query).sort({ createdAt: -1 });

    if (shouldPaginate) {
      categoriesQuery = categoriesQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [categories, total] = await Promise.all([
      categoriesQuery,
      Category.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: categories.length,
      total,
      page: shouldPaginate ? pageNum : 1,
      pages: shouldPaginate ? Math.max(Math.ceil(total / limitNum), 1) : 1,
      limit: shouldPaginate ? limitNum : total,
      categories: categories.map(category => ({
        id: category._id,
        name: category.name,
        description: category.description,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { name, description, status } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Category with this name already exists",
        });
      }
    }

    // Update fields
    if (name !== undefined) {
      category.name = name;
    }
    if (description !== undefined) {
      category.description = description;
    }
    if (status !== undefined) {
      // Validate status
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Status must be either 'active' or 'inactive'",
        });
      }
      category.status = status;
    }

    // Save updated category
    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Prevent deleting a category that products still reference
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is used by ${productCount} product${productCount === 1 ? "" : "s"}.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};