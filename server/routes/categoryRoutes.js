const express = require("express");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Admin routes - Full CRUD access
router.post("/", authorize("admin"), createCategory);
router.put("/:id", authorize("admin"), updateCategory);
router.delete("/:id", authorize("admin"), deleteCategory);

// Admin and Employee routes - Read-only access
router.get("/", authorize(["admin", "employee"]), getCategories);
router.get("/:id", authorize(["admin", "employee"]), getCategoryById);

module.exports = router;
