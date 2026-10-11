const express = require("express");

const { getSystemOverview } = require("../controllers/systemController");

const authenticate = require("../middleware/authMiddleware");
const { requireSuperAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

router.use(authenticate, requireSuperAdmin);

router.get("/overview", getSystemOverview);

module.exports = router;
