const express = require("express");

const { getTrackers, getSummary, getTrackerById } = require("../controllers/trackingController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Tracking: where each purchase order / delivery has got to (Purchase Order -> Gate Entry -> GRN -> Putaway)
// and what has to be done next. Read-only; permission: tracking:view.
router.use(authenticate, requireOrganization);

router.get("/", requirePermission("tracking", "view"), getTrackers);
// Before the id route so "summary" is not read as a type.
router.get("/summary", requirePermission("tracking", "view"), getSummary);
router.get("/:type/:id", requirePermission("tracking", "view"), getTrackerById);

module.exports = router;
