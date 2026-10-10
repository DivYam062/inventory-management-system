const mongoose = require("mongoose");
const { CURRENCY_CODES, UNIT_CODES } = require("../config/referenceData");

// Per-organization configuration. One document per organization, created the first time it is read.
// currencies / units: the codes (from the system lists) this organization has enabled; only those are
// offered when picking a currency or a unit of measurement.
const configurationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      unique: true,
    },

    currencies: { type: [String], default: () => [...CURRENCY_CODES] },

    units: { type: [String], default: () => [...UNIT_CODES] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Configuration", configurationSchema);
