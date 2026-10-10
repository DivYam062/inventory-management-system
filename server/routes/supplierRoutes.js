const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  assignSupplier,
  unassignSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization suppliers. Permissions: view, create, edit. "edit" also covers assigning / unassigning a
// supplier, deleting it and switching it active/inactive.
router.use(authenticate);

router.get("/", requirePermission("supplier", "view"), getSuppliers);
router.get("/:id", requirePermission("supplier", "view"), getSupplierById);
router.post("/", requirePermission("supplier", "create"), createSupplier);
router.put("/:id", requirePermission("supplier", "edit"), updateSupplier);
router.post("/:id/assign", requirePermission("supplier", "edit"), assignSupplier);
router.post("/:id/unassign", requirePermission("supplier", "edit"), unassignSupplier);
router.delete("/:id", requirePermission("supplier", "edit"), deleteSupplier);

module.exports = router;
