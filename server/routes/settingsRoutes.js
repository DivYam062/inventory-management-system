const express = require("express");

const { getSettings, updateSettings } = require("../controllers/settingsController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Read access - Admin and Employee (prices are shown to both)
router.get("/", authorize(["admin", "employee"]), getSettings);

// Update - Admin only
router.put("/", authorize("admin"), updateSettings);

module.exports = router;
