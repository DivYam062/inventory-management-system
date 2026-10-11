const express = require("express");

const {
  getConfiguration,
  updateConfiguration,
  addCurrency,
  deleteCurrency,
  addUnit,
  deleteUnit,
} = require("../controllers/configurationController");
const authenticate = require("../middleware/authMiddleware");
const { requirePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization configuration (enabled currencies and units of measurement, custom ones, ...).
// "edit" covers switching entries on/off, adding custom ones and deleting them.
router.use(authenticate);

router.get("/", requirePermission("configuration", "view"), getConfiguration);
router.put("/", requirePermission("configuration", "edit"), updateConfiguration);

router.post("/currencies", requirePermission("configuration", "edit"), addCurrency);
router.delete("/currencies/:code", requirePermission("configuration", "edit"), deleteCurrency);

router.post("/units", requirePermission("configuration", "edit"), addUnit);
router.delete("/units/:code", requirePermission("configuration", "edit"), deleteUnit);

module.exports = router;
