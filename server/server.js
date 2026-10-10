require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./utils/createSuperAdmin");
const { ensureSupportUsers } = require("./services/supportUserService");
const migrateDeletePermission = require("./utils/migrateDeletePermission");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    await createSuperAdmin();
  } catch (error) {
    console.error(`Super Admin setup failed: ${error.message}`);
    process.exit(1);
  }

  // Roles saved with the old separate Delete permission are converted to Edit.
  try {
    await migrateDeletePermission();
  } catch (error) {
    console.error(`Delete permission migration failed: ${error.message}`);
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
