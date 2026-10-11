const express = require("express");

const { createGrn, getSource, getGrns, getGrnById, inspectGrn, cancelGrn } = require("../controllers/grnController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");
const { requireModule } = require("../middleware/moduleMiddleware");

const router = express.Router();

// GRNs. Permissions: view, create (receive goods), edit (inspect or cancel). There is no delete: a GRN can
// only be cancelled, and only before inspection. The whole API is closed while the GRN module is switched off
// in Configuration.
router.use(authenticate, requireOrganization, requireModule("grn"));

router.get("/", requirePermission("grn", "view"), getGrns);
// What the form starts from (before the id routes so "source" is not read as an id).
router.get("/source", requirePermission("grn", "create"), getSource);
router.get("/:id", requirePermission("grn", "view"), getGrnById);
router.post("/", requirePermission("grn", "create"), createGrn);
router.post("/:id/inspect", requirePermission("grn", "edit"), inspectGrn);
router.post("/:id/cancel", requirePermission("grn", "edit"), cancelGrn);

module.exports = router;
