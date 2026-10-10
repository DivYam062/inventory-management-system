const express = require("express");

const {
  getPermissionCatalog,
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission, requireAnyPermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization roles. Role permissions: view, create, edit. "edit" also covers deleting a role.
router.use(authenticate);

// The features and actions a role can be given (for the permission picker). Needed by anyone who can
// view, create or edit roles.
router.get(
  "/permissions",
  requireAnyPermission([["role", "view"], ["role", "create"], ["role", "edit"]]),
  getPermissionCatalog
);

router.get("/", requirePermission("role", "view"), getRoles);
router.get("/:id", requirePermission("role", "view"), getRoleById);
router.post("/", requirePermission("role", "create"), createRole);
router.put("/:id", requirePermission("role", "edit"), updateRole);
router.delete("/:id", requirePermission("role", "edit"), deleteRole);

module.exports = router;
