const express = require("express");

const { loginUser } = require("../controllers/authController");
const { getProfile, updateProfile } = require("../controllers/profileController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Login (system and organization users). There is no self-registration:
// organization users are created by their organization, Super Admin by startup seeding.
router.post("/login", loginUser);

// Current session context (user, organization, permissions)
router.get("/profile", authenticate, getProfile);

// Update own name/phone
router.put("/profile", authenticate, updateProfile);

module.exports = router;
