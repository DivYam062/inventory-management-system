const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");
const { createImageUpload } = require("../middleware/uploadMiddleware");

const uploadImage = createImageUpload("products", { maxSizeMB: 5 }).single("image");

const router = express.Router();

// Organization products. Permissions: view, create, edit. "edit" also covers deleting a product and
// switching it active/inactive. Create and update accept multipart form data (optional "image" file).
router.use(authenticate);

router.get("/", requirePermission("product", "view"), getProducts);
router.get("/:id", requirePermission("product", "view"), getProductById);
router.post("/", requirePermission("product", "create"), uploadImage, createProduct);
router.put("/:id", requirePermission("product", "edit"), uploadImage, updateProduct);
router.delete("/:id", requirePermission("product", "edit"), deleteProduct);

module.exports = router;
