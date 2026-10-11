const express = require("express");

const { getAuditLogs } = require("../controllers/auditLogController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization, requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Audit log. Read-only; permission: audit-log:view. Entries are written by the services that do the work.
router.use(authenticate, requireOrganization);

router.get("/", requirePermission("audit-log", "view"), getAuditLogs);

module.exports = router;
