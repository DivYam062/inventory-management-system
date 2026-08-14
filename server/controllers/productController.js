const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");

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

// Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate(["category", "supplier"]);

    return res.status(200).json({
      success: true,
      count: products.length,
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