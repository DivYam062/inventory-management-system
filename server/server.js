require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const createSuperAdmin = require("./utils/createSuperAdmin");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    await createSuperAdmin();
  } catch (error) {
    console.error(`Super Admin setup failed: ${error.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}. http://localhost:${PORT}`);
  });
};

startServer();
