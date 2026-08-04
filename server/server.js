require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const createDefaultAdmin = require("./utils/createDefaultAdmin");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  await createDefaultAdmin();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}. http://localhost:${PORT}`);
  });
};

startServer();