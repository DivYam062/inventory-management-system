const express = require("express");

const {
  getAssignableRoles,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const authenticate = require("../middleware/authMiddleware");
const { requirePermission, requireAnyPermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// Organization users. User permissions: view, create, edit. "edit" also covers deleting a user and
// switching them active/inactive.
router.use(authenticate);

// Roles the caller may assign (for the role dropdown). Needed by anyone who can create or edit users.
router.get("/assignable-roles", requireAnyPermission([["user", "create"], ["user", "edit"]]), getAssignableRoles);

router.get("/", requirePermission("user", "view"), getUsers);
router.get("/:id", requirePermission("user", "view"), getUserById);
router.post("/", requirePermission("user", "create"), createUser);
router.put("/:id", requirePermission("user", "edit"), updateUser);
router.delete("/:id", requirePermission("user", "edit"), deleteUser);

module.exports = router;
