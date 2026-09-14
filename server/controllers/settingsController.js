const Settings = require("../models/Settings");

const { SUPPORTED_CURRENCIES } = Settings;

// Settings is a singleton — always operate on the single existing document,
// creating it with defaults the first time it's needed.
const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    settings = await Settings.create({});
  }

  return settings;
};

// Get application settings
const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.status(200).json({
      success: true,
      settings: {
        currency: settings.currency,
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

// Update application settings (admin only)
const updateSettings = async (req, res) => {
  try {
    const { currency } = req.body;

    if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Invalid currency. Must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`,
      });
    }

    const settings = await getOrCreateSettings();
    settings.currency = currency;
    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      settings: {
        currency: settings.currency,
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
  getSettings,
  updateSettings,
};
