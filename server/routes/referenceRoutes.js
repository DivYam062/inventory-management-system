const express = require("express");

const { getCurrencies, getUnits } = require("../controllers/referenceController");
const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Reference lists (currencies, units of measurement). Read-only; any signed-in user.
router.get("/currencies", authenticate, getCurrencies);
router.get("/units", authenticate, getUnits);

module.exports = router;
