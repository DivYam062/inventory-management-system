const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const systemRoutes = require("./routes/systemRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const productRoutes = require("./routes/productRoutes");
const referenceRoutes = require("./routes/referenceRoutes");
const configurationRoutes = require("./routes/configurationRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const gateEntryRoutes = require("./routes/gateEntryRoutes");
const grnRoutes = require("./routes/grnRoutes");
const putawayRoutes = require("./routes/putawayRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
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

// Organization users (permission-based, scoped to the caller's organization)
app.use("/api/users", userRoutes);

// Organization roles and permissions
app.use("/api/roles", roleRoutes);

// Catalog: categories
app.use("/api/categories", categoryRoutes);

// Sellers (the external organizations products and purchase orders are made against)
app.use("/api/sellers", sellerRoutes);

// Suppliers (people who work for a seller; one seller at a time)
app.use("/api/suppliers", supplierRoutes);

// Catalog: products (made under a seller, belong to a category, optional image)
app.use("/api/products", productRoutes);

// Purchase orders (closed while the module is switched off in Configuration)
app.use("/api/purchase-orders", purchaseOrderRoutes);

// Gate entries (closed while the module is switched off in Configuration)
app.use("/api/gate-entries", gateEntryRoutes);

// GRNs (closed while the module is switched off in Configuration)
app.use("/api/grns", grnRoutes);

// Putaways (passed GRN goods into inventory; closed while the GRN module is off)
app.use("/api/putaways", putawayRoutes);

// Total inventory: stock per product, manual increase / decrease, history
app.use("/api/inventory", inventoryRoutes);

// Organization configuration (enabled currencies and units)
app.use("/api/configuration", configurationRoutes);

// Reference lists: /api/currencies, /api/units
app.use("/api", referenceRoutes);

// NOTE: dashboard and settings routes were
// removed from the API in the authorization migration. They are rebuilt organization-scoped
// and permission-protected in their own phases (see NEW_SYSTEM_FLOW.md).

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be after all routes)
app.use(errorHandler);

module.exports = app;
