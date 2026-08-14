const express = require("express");

const {
  createTransaction,
  getInventoryTransactions,
  getInventoryTransactionById,
} = require("../controllers/inventoryController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Create inventory transaction (stock-in or stock-out) - Admin and Employee
router.post("/", authorize(["admin", "employee"]), createTransaction);

// Get all inventory transactions - Admin and Employee
router.get("/", authorize(["admin", "employee"]), getInventoryTransactions);

// Get single inventory transaction by ID - Admin and Employee
router.get("/:id", authorize(["admin", "employee"]), getInventoryTransactionById);

module.exports = router;