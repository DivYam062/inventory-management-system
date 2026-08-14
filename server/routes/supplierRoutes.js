const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Admin routes - Full CRUD access
router.post("/", authorize("admin"), createSupplier);
router.put("/:id", authorize("admin"), updateSupplier);
router.delete("/:id", authorize("admin"), deleteSupplier);

// Admin and Employee routes - Read-only access
router.get("/", authorize(["admin", "employee"]), getSuppliers);
router.get("/:id", authorize(["admin", "employee"]), getSupplierById);

module.exports = router;