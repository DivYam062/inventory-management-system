const User = require("../models/User");

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const { name, phone } = req.body;

    // Update fields (email is not allowed to be changed)
    if (name !== undefined) {
      user.name = name;
    }
    if (phone !== undefined) {
      user.phone = phone || undefined;
    }

    // Save updated user
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};