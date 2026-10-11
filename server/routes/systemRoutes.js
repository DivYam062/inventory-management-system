const express = require("express");

const { getSystemOverview } = require("../controllers/systemController");

const authenticate = require("../middleware/authMiddleware");
const { requireSuperAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

// System-level routes: System Admin only
router.use(authenticate, requireSuperAdmin);

router.get("/overview", getSystemOverview);

module.exports = router;
