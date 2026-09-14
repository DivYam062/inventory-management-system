const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Admin routes - Full CRUD access
router.post("/", authorize("admin"), upload.single("image"), createProduct);
router.put("/:id", authorize("admin"), upload.single("image"), updateProduct);
router.delete("/:id", authorize("admin"), deleteProduct);

// Admin and Employee routes - Read-only access
router.get("/", authorize(["admin", "employee"]), getProducts);
router.get("/:id", authorize(["admin", "employee"]), getProductById);

module.exports = router;