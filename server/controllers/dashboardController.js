const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const InventoryTransaction = require("../models/InventoryTransaction");

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalSuppliers = await Supplier.countDocuments();

    // Get low stock products (quantity <= minimumStock)
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ["$quantity", "$minimumStock"] },
    });

    // Get out of stock products (quantity = 0)
    const outOfStockProducts = await Product.countDocuments({
      quantity: 0,
    });

    // Get total inventory value (sum of price * quantity)
    const products = await Product.find({});
    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + product.price * product.quantity;
    }, 0);

    // Get total transactions count
    const totalTransactions = await InventoryTransaction.countDocuments();

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = await InventoryTransaction.countDocuments({
      createdAt: { $gte: today },
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalCategories,
        totalSuppliers,
        lowStockProducts,
        outOfStockProducts,
        totalInventoryValue: Math.round(totalInventoryValue),
        totalTransactions,
        todayTransactions,
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
  getDashboardStats,
};