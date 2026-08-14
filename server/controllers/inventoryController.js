const Product = require("../models/Product");
const InventoryTransaction = require("../models/InventoryTransaction");

// Create inventory transaction (stock-in or stock-out)
const createTransaction = async (req, res) => {
  try {
    const { product, type, quantity, notes } = req.body;

    // Validate transaction type
    if (!["stock-in", "stock-out"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type. Must be either 'stock-in' or 'stock-out'",
      });
    }

    // Verify product exists
    const productExists = await Product.findById(product);
    if (!productExists) {
      return res.status(400).json({
        success: false,
        message: "Product not found",
      });
    }

    // Calculate previous and new stock
    const previousStock = productExists.quantity;
    let newStock;

    if (type === "stock-in") {
      newStock = previousStock + quantity;
    } else {
      // stock-out
      if (previousStock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Available: ${previousStock}, Requested: ${quantity}`,
        });
      }
      newStock = previousStock - quantity;
    }

    // Create inventory transaction
    const transaction = await InventoryTransaction.create({
      product,
      type,
      quantity,
      previousStock,
      newStock,
      performedBy: req.user._id,
      notes,
    });

    // Update product quantity
    productExists.quantity = newStock;
    await productExists.save();

    // Populate transaction for response
    await transaction.populate(["product", "performedBy"]);

    const message = type === "stock-in" ? "Stock added successfully" : "Stock removed successfully";

    return res.status(201).json({
      success: true,
      message,
      transaction: {
        id: transaction._id,
        product: {
          id: productExists._id,
          name: productExists.name,
          sku: productExists.sku,
        },
        type: transaction.type,
        quantity: transaction.quantity,
        previousStock: transaction.previousStock,
        newStock: transaction.newStock,
        performedBy: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        },
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
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

// Get all inventory transactions
const getInventoryTransactions = async (req, res) => {
  try {
    const transactions = await InventoryTransaction.find({})
      .populate(["product", "performedBy"])
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(transaction => ({
        id: transaction._id,
        product: {
          id: transaction.product._id,
          name: transaction.product.name,
          sku: transaction.product.sku,
        },
        type: transaction.type,
        quantity: transaction.quantity,
        previousStock: transaction.previousStock,
        newStock: transaction.newStock,
        performedBy: {
          id: transaction.performedBy._id,
          name: transaction.performedBy.name,
          email: transaction.performedBy.email,
        },
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
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

// Get single inventory transaction by ID
const getInventoryTransactionById = async (req, res) => {
  try {
    const transaction = await InventoryTransaction.findById(req.params.id)
      .populate(["product", "performedBy"]);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      transaction: {
        id: transaction._id,
        product: {
          id: transaction.product._id,
          name: transaction.product.name,
          sku: transaction.product.sku,
        },
        type: transaction.type,
        quantity: transaction.quantity,
        previousStock: transaction.previousStock,
        newStock: transaction.newStock,
        performedBy: {
          id: transaction.performedBy._id,
          name: transaction.performedBy.name,
          email: transaction.performedBy.email,
        },
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
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

module.exports = {
  createTransaction,
  getInventoryTransactions,
  getInventoryTransactionById,
};
