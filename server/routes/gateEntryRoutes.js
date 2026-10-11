const express = require("express");

const {
  createGateEntry,
  getGateEntries,
  getGateEntryById,
  updateGateEntry,
  cancelGateEntry,
} = require("../controllers/gateEntryController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");
const { requireModule } = require("../middleware/moduleMiddleware");

const router = express.Router();

// Gate entries. Permissions: view, create, edit. "edit" also covers cancelling a pending entry. There is no delete: a gate entry can only be cancelled.
// The whole API is closed while the Gate Entry module is switched off in Configuration.
router.use(authenticate, requireOrganization, requireModule("gateEntry"));

router.get("/", requirePermission("gate-entry", "view"), getGateEntries);
router.get("/:id", requirePermission("gate-entry", "view"), getGateEntryById);
router.post("/", requirePermission("gate-entry", "create"), createGateEntry);
router.put("/:id", requirePermission("gate-entry", "edit"), updateGateEntry);
router.post("/:id/cancel", requirePermission("gate-entry", "edit"), cancelGateEntry);

module.exports = router;
