const express = require("express");

const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization categories. Permissions: view, create, edit. "edit" also covers deleting a category and
// switching it active/inactive.
router.use(authenticate);

router.get("/", requirePermission("category", "view"), getCategories);
router.get("/:id", requirePermission("category", "view"), getCategoryById);
router.post("/", requirePermission("category", "create"), createCategory);
router.put("/:id", requirePermission("category", "edit"), updateCategory);
router.delete("/:id", requirePermission("category", "edit"), deleteCategory);

module.exports = router;
