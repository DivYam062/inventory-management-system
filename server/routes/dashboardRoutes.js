const express = require("express");

const { getDashboard } = require("../controllers/dashboardController");

const authenticate = require("../middleware/authMiddleware");
const { requireOrganization } = require("../middleware/permissionMiddleware");

const router = express.Router();

// The organization dashboard. Any organization user may open it; what it returns depends on the user's
// permissions (only the sections the role may view) and on the organization's module switches.
router.use(authenticate, requireOrganization);

router.get("/", getDashboard);

module.exports = router;
