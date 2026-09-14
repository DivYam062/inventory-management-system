const fs = require("fs");
const path = require("path");

const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");

// Best-effort removal of a product's image file from disk (never blocks the response)
const deleteImageFile = (imagePath) => {
  if (!imagePath) return;

  const absolutePath = path.join(__dirname, "..", imagePath.replace(/^\//, ""));
  fs.unlink(absolutePath, () => {});
};

// Create product
const createProduct = async (req, res) => {
  try {
    const { name, sku, description, category, supplier, price, quantity, minimumStock, status } = req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
      });
    }

    // Verify category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    // Verify supplier exists
    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(400).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Create new product
    const product = await Product.create({
      name,
      sku,
      description,
      category,
      supplier,
      price,
      quantity,
      minimumStock,
      status,
      image: req.file ? `/uploads/products/${req.file.filename}` : null,
    });

    // Populate category and supplier for response
    await product.populate(["category", "supplier"]);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: {
          id: categoryExists._id,
          name: categoryExists.name,
        },
        supplier: {
          id: supplierExists._id,
          name: supplierExists.name,
          companyName: supplierExists.companyName,
        },
        price: product.price,
        quantity: product.quantity,
        minimumStock: product.minimumStock,
        status: product.status,
        image: product.image,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
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

// Get all products (supports search, category/stock-status filters, and optional pagination)
const getProducts = async (req, res) => {
  try {
    const { search, category, stockStatus, page, limit } = req.query;

    const query = {};

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { sku: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (stockStatus === "out-of-stock") {
      query.quantity = 0;
    } else if (stockStatus === "low-stock") {
      query.$expr = {
        $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$minimumStock"] }],
      };
    } else if (stockStatus === "in-stock") {
      query.$expr = { $gt: ["$quantity", "$minimumStock"] };
    }

    // Pagination only activates when the caller explicitly asks for it, so
    // existing callers that fetch the full list (e.g. the dashboard) are unaffected.
    const shouldPaginate = page !== undefined || limit !== undefined;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1);

    let productsQuery = Product.find(query)
      .populate(["category", "supplier"])
      .sort({ createdAt: -1 });

    if (shouldPaginate) {
      productsQuery = productsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [products, total] = await Promise.all([
      productsQuery,
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: shouldPaginate ? pageNum : 1,
      pages: shouldPaginate ? Math.max(Math.ceil(total / limitNum), 1) : 1,
      limit: shouldPaginate ? limitNum : total,
      products: products.map(product => ({
        id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: {
          id: product.category._id,
          name: product.category.name,
        },
        supplier: {
          id: product.supplier._id,
          name: product.supplier.name,
          companyName: product.supplier.companyName,
        },
        price: product.price,
        quantity: product.quantity,
        minimumStock: product.minimumStock,
        status: product.status,
        image: product.image,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
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

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(["category", "supplier"]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: {
          id: product.category._id,
          name: product.category.name,
        },
        supplier: {
          id: product.supplier._id,
          name: product.supplier.name,
          companyName: product.supplier.companyName,
        },
        price: product.price,
        quantity: product.quantity,
        minimumStock: product.minimumStock,
        status: product.status,
        image: product.image,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
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

// Update product
const updateProduct = async (req, res) => {
  try {
    const { name, sku, description, category, supplier, price, quantity, minimumStock, status } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if new SKU already exists (if SKU is being updated)
    if (sku && sku !== product.sku) {
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // Verify category exists if being updated
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    // Verify supplier exists if being updated
    if (supplier && supplier !== product.supplier.toString()) {
      const supplierExists = await Supplier.findById(supplier);
      if (!supplierExists) {
        return res.status(400).json({
          success: false,
          message: "Supplier not found",
        });
      }
    }

    // Update fields
    if (name !== undefined) {
      product.name = name;
    }
    if (sku !== undefined) {
      product.sku = sku.toUpperCase();
    }
    if (description !== undefined) {
      product.description = description;
    }
    if (category !== undefined) {
      product.category = category;
    }
    if (supplier !== undefined) {
      product.supplier = supplier;
    }
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price cannot be negative",
        });
      }
      product.price = price;
    }
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity cannot be negative",
        });
      }
      product.quantity = quantity;
    }
    if (minimumStock !== undefined) {
      if (minimumStock < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum stock cannot be negative",
        });
      }
      product.minimumStock = minimumStock;
    }
    if (status !== undefined) {
      // Validate status
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Status must be either 'active' or 'inactive'",
        });
      }
      product.status = status;
    }

    // Replace image if a new one was uploaded; clear it if explicitly requested
    if (req.file) {
      deleteImageFile(product.image);
      product.image = `/uploads/products/${req.file.filename}`;
    } else if (req.body.removeImage === "true") {
      deleteImageFile(product.image);
      product.image = null;
    }

    // Save updated product
    await product.save();

    // Populate for response
    await product.populate(["category", "supplier"]);

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: {
          id: product.category._id,
          name: product.category.name,
        },
        supplier: {
          id: product.supplier._id,
          name: product.supplier.name,
          companyName: product.supplier.companyName,
        },
        price: product.price,
        quantity: product.quantity,
        minimumStock: product.minimumStock,
        status: product.status,
        image: product.image,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
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

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    deleteImageFile(product.image);

    await Product.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
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
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};