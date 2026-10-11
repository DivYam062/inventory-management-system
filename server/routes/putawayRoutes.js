const express = require("express");

const {
  getPendingGrns,
  getPendingGrnItems,
  createPutaway,
  getPutaways,
  getPutawayById,
} = require("../controllers/putawayController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");
const { requireModule } = require("../middleware/moduleMiddleware");

const router = express.Router();

// Putaways. Permissions: view, create (put goods away). There is no edit or delete: a putaway is a permanent
// record of stock that entered inventory. Putaway works on GRNs, so the API is closed while the GRN module is
// switched off in Configuration.
router.use(authenticate, requireOrganization, requireModule("grn"));

// What the form starts from (before the id route so "grns" is not read as an id).
router.get("/grns", requirePermission("putaway", "create"), getPendingGrns);
router.get("/grns/:grnId", requirePermission("putaway", "create"), getPendingGrnItems);

router.get("/", requirePermission("putaway", "view"), getPutaways);
router.get("/:id", requirePermission("putaway", "view"), getPutawayById);
router.post("/", requirePermission("putaway", "create"), createPutaway);

module.exports = router;
