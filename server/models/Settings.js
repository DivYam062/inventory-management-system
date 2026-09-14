const mongoose = require("mongoose");

const SUPPORTED_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

const settingsSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      enum: SUPPORTED_CURRENCIES,
      default: "INR",
    },
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
module.exports.SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;
