const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory Management API is running",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// User routes (admin only)
app.use("/api/users", userRoutes);

// Category routes (admin only)
app.use("/api/categories", categoryRoutes);

module.exports = app;
