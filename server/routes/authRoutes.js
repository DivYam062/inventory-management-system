const express = require("express");

const { loginUser } = require("../controllers/authController");
const { getProfile, updateProfile, changePassword } = require("../controllers/profileController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

// Login (system and organization users). There is no self-registration:
// organization users are created by their organization, System Admin by startup seeding.
router.post("/login", loginUser);

router.get("/profile", authenticate, getProfile);

router.put("/profile", authenticate, updateProfile);

router.put("/password", authenticate, changePassword);

module.exports = router;
