const express = require("express");

const { getDashboardStats } = require("../controllers/dashboardController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// All routes below require authentication
router.use(protect);

// Get dashboard statistics - Admin and Employee
router.get("/", authorize(["admin", "employee"]), getDashboardStats);

module.exports = router;