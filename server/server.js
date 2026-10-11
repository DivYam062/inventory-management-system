require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./utils/createSuperAdmin");
const { ensureSupportUsers } = require("./services/supportUserService");
const migrateDeletePermission = require("./utils/migrateDeletePermission");
const migrateRoleNames = require("./utils/migrateRoleNames");
const Category = require("./models/Category");
const Supplier = require("./models/Supplier");
const Product = require("./models/Product");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    await createSuperAdmin();
  } catch (error) {
    console.error(`System Admin setup failed: ${error.message}`);
    process.exit(1);
  }

  // Categories were globally unique by name; they are now unique per organization. syncIndexes drops the
  // old index and builds the new one.
  try {
    await Category.syncIndexes();
  } catch (error) {
    console.error(`Category index sync failed: ${error.message}`);
  }

  // Same for suppliers (the old model was unique by name; the new one is unique by email per organization).
  try {
    await Supplier.syncIndexes();
  } catch (error) {
    console.error(`Supplier index sync failed: ${error.message}`);
  }

  // Products were globally unique by SKU; they are now unique per organization.
  try {
    await Product.syncIndexes();
  } catch (error) {
    console.error(`Product index sync failed: ${error.message}`);
  }

  // Roles saved with the old separate Delete permission are converted to Edit.
  try {
    await migrateDeletePermission();
  } catch (error) {
    console.error(`Delete permission migration failed: ${error.message}`);
  }

  // System roles saved under an old name (Default Admin) take their current name (Network Admin).
  try {
    await migrateRoleNames();
  } catch (error) {
    console.error(`Role name migration failed: ${error.message}`);
  }

  // Existing organizations created before the Support user existed get one now.
  try {
    await ensureSupportUsers();
  } catch (error) {
    console.error(`Support user backfill failed: ${error.message}`);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}. http://localhost:${PORT}`);
  });
};

startServer();
