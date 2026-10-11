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

  try {
    await Category.syncIndexes();
  } catch (error) {
    console.error(`Category index sync failed: ${error.message}`);
  }

  try {
    await Supplier.syncIndexes();
  } catch (error) {
    console.error(`Supplier index sync failed: ${error.message}`);
  }

  try {
    await Product.syncIndexes();
  } catch (error) {
    console.error(`Product index sync failed: ${error.message}`);
  }

  try {
    await migrateDeletePermission();
  } catch (error) {
    console.error(`Delete permission migration failed: ${error.message}`);
  }

  try {
    await migrateRoleNames();
  } catch (error) {
    console.error(`Role name migration failed: ${error.message}`);
  }

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
