const express = require("express");

const { getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication and admin privileges
router.use(protect);
router.use(authorize("admin"));

// Get all users
router.get("/", getUsers);

// Get single user by ID
router.get("/:id", getUserById);

// Update user
router.put("/:id", updateUser);

// Delete user
router.delete("/:id", deleteUser);

module.exports = router;