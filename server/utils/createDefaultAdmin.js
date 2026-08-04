const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createDefaultAdmin = async () => {
  try {
    const existingAdmin = await User.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      10
    );

    await User.create({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Default admin created successfully");
  } catch (error) {
    console.error(
      "Error creating default admin:",
      error.message
    );
  }
};

module.exports = createDefaultAdmin;