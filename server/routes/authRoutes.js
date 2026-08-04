const express = require("express");

const { registerUser, loginUser } = require("../controllers/authController");

const router = express.Router();

// Register user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

module.exports = router;