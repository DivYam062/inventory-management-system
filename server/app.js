const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const systemRoutes = require("./routes/systemRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded product images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory Management API is running",
  });
});

// Auth routes (login, session profile)
app.use("/api/auth", authRoutes);

// System routes (Super Admin only)
app.use("/api/system", systemRoutes);

// Organization management (Super Admin only)
app.use("/api/organizations", organizationRoutes);

// NOTE: category, supplier, product, inventory, dashboard, settings and user routes were
// removed from the API in the authorization migration. They are rebuilt organization-scoped
// and permission-protected in their own phases (see NEW_SYSTEM_FLOW.md).

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be after all routes)
app.use(errorHandler);

module.exports = app;
