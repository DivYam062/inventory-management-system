const express = require("express");

const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrderController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");
const { requireModule } = require("../middleware/moduleMiddleware");

const router = express.Router();

// Purchase orders. Permissions: view, create, edit. "edit" also covers issuing, cancelling and deleting a
// draft. The whole API is closed while the Purchase Order module is switched off in Configuration.
router.use(authenticate, requireOrganization, requireModule("purchaseOrder"));

router.get("/", requirePermission("purchase-order", "view"), getPurchaseOrders);
router.get("/:id", requirePermission("purchase-order", "view"), getPurchaseOrderById);
router.post("/", requirePermission("purchase-order", "create"), createPurchaseOrder);
router.put("/:id", requirePermission("purchase-order", "edit"), updatePurchaseOrder);
router.post("/:id/issue", requirePermission("purchase-order", "edit"), issuePurchaseOrder);
router.post("/:id/cancel", requirePermission("purchase-order", "edit"), cancelPurchaseOrder);
router.delete("/:id", requirePermission("purchase-order", "edit"), deletePurchaseOrder);

module.exports = router;
