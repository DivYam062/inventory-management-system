require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}. http://localhost:${PORT}`);
});
