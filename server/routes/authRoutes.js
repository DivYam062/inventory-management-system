const express = require("express");

const { registerUser, loginUser } = require("../controllers/authController");
const { getProfile, updateProfile } = require("../controllers/profileController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Get user profile (protected)
router.get("/profile", protect, getProfile);

// Update user profile (protected)
router.put("/profile", protect, updateProfile);

module.exports = router;
