const express = require("express");

const { getConfiguration, updateConfiguration } = require("../controllers/configurationController");
const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization configuration (enabled currencies and units of measurement, ...).
router.use(authenticate);

router.get("/", requirePermission("configuration", "view"), getConfiguration);
router.put("/", requirePermission("configuration", "edit"), updateConfiguration);

module.exports = router;
