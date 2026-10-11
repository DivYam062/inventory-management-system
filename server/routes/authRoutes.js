const express = require("express");

const { loginUser } = require("../controllers/authController");
const { getProfile, updateProfile, changePassword } = require("../controllers/profileController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Login (system and organization users). There is no self-registration:
// organization users are created by their organization, System Admin by startup seeding.
router.post("/login", loginUser);

// Current session context (user, organization, permissions)
router.get("/profile", authenticate, getProfile);

// Update own name/phone (email can never be changed)
router.put("/profile", authenticate, updateProfile);

// Change own password (needs the current password)
router.put("/password", authenticate, changePassword);

module.exports = router;
