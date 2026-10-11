const express = require("express");

const {
  getInventory,
  getSummary,
  getStockByProduct,
  getTransactions,
  adjustStock,
} = require("../controllers/inventoryController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Total inventory. Permissions: view, edit. "edit" is what increases or decreases stock by hand. Stock rows
// are created by Putaway and are never deleted; every change is kept in the history.
router.use(authenticate, requireOrganization);

router.get("/", requirePermission("inventory", "view"), getInventory);
// Before the :productId routes so "summary" is not read as an id.
router.get("/summary", requirePermission("inventory", "view"), getSummary);
router.get("/:productId", requirePermission("inventory", "view"), getStockByProduct);
router.get("/:productId/transactions", requirePermission("inventory", "view"), getTransactions);
router.post("/:productId/adjust", requirePermission("inventory", "edit"), adjustStock);

module.exports = router;
