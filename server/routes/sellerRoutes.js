const express = require("express");

const {
  createSeller,
  getSellers,
  getSellerById,
  updateSeller,
  deleteSeller,
} = require("../controllers/sellerController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization sellers. Permissions: view, create, edit. "edit" also covers deleting a seller and
// switching it active/inactive.
router.use(authenticate);

router.get("/", requirePermission("seller", "view"), getSellers);
router.get("/:id", requirePermission("seller", "view"), getSellerById);
router.post("/", requirePermission("seller", "create"), createSeller);
router.put("/:id", requirePermission("seller", "edit"), updateSeller);
router.delete("/:id", requirePermission("seller", "edit"), deleteSeller);

module.exports = router;
