const express = require("express");

const {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} = require("../controllers/organizationController");

const authenticate = require("../middleware/authMiddleware");
const { requireSuperAdmin } = require("../middleware/permissionMiddleware");
const { createImageUpload } = require("../middleware/uploadMiddleware");

const uploadLogo = createImageUpload("logos", { maxSizeMB: 2 }).single("logo");

const router = express.Router();

// Organization management is system-level: System Admin only
router.use(authenticate, requireSuperAdmin);

router.route("/").get(getOrganizations).post(uploadLogo, createOrganization);
router.route("/:id").get(getOrganizationById).put(uploadLogo, updateOrganization).delete(deleteOrganization);

module.exports = router;
