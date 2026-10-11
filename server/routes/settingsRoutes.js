const express = require("express");

const { getSettings, updateSettings } = require("../controllers/settingsController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", authorize(["admin", "employee"]), getSettings);

router.put("/", authorize("admin"), updateSettings);

module.exports = router;
