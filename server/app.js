const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const productRoutes = require("./routes/productRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

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

// Category routes (admin and employee)
app.use("/api/categories", categoryRoutes);

// Supplier routes (admin and employee)
app.use("/api/suppliers", supplierRoutes);

// Product routes (admin and employee)
app.use("/api/products", productRoutes);

// Inventory routes (admin and employee)
app.use("/api/inventory", inventoryRoutes);

// Dashboard routes (admin and employee)
app.use("/api/dashboard", dashboardRoutes);

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be after all routes)
app.use(errorHandler);

module.exports = app;
