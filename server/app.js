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
const trackingRoutes = require("./routes/trackingRoutes");
const auditLogRoutes = require("./routes/auditLogRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// CLIENT_URL (comma-separated) limits browser access to the deployed client; unset allows any origin (local use).
const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map((url) => url.trim()) : true;
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Inventory Management API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/system", systemRoutes);

app.use("/api/organizations", organizationRoutes);

app.use("/api/users", userRoutes);

app.use("/api/roles", roleRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/sellers", sellerRoutes);

app.use("/api/suppliers", supplierRoutes);

app.use("/api/products", productRoutes);

app.use("/api/purchase-orders", purchaseOrderRoutes);

app.use("/api/gate-entries", gateEntryRoutes);

app.use("/api/grns", grnRoutes);

app.use("/api/putaways", putawayRoutes);

app.use("/api/inventory", inventoryRoutes);

app.use("/api/tracking", trackingRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/audit-logs", auditLogRoutes);

app.use("/api/configuration", configurationRoutes);

app.use("/api", referenceRoutes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
