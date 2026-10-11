const mongoose = require("mongoose");
const { CURRENCY_CODES, UNIT_CODES } = require("../config/referenceData");

// Currencies and units the organization added itself, on top of the system lists.
const customCurrencySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    symbol: { type: String, trim: true, maxlength: 5 },
  },
  { _id: false }
);

const customUnitSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
  },
  { _id: false }
);

// Per-organization configuration. One document per organization, created the first time it is read.
// currencies / units: the codes this organization has enabled (system list codes and its own custom
// codes); only those are offered when picking a currency or a unit of measurement.
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

    // Which receiving-flow modules the organization uses. A disabled module disappears from the menu, its
    // pages are closed, and its API refuses requests. All on by default.
    modules: {
      purchaseOrder: { type: Boolean, default: true },
      gateEntry: { type: Boolean, default: true },
      grn: { type: Boolean, default: true },
    },

    // Purchase order settings (shown only while the Purchase Order module is on).
    purchaseOrder: {
      // Whether a GRN may receive more of an item than the purchase order asked for.
      allowOverReceiving: { type: Boolean, default: false },
    },

    customCurrencies: { type: [customCurrencySchema], default: [] },

    customUnits: { type: [customUnitSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Configuration", configurationSchema);
