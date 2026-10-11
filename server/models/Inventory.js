const mongoose = require("mongoose");

// Current stock of one product in an organization. There is one row per product, created by the first
// putaway. The quantity only ever changes through an InventoryTransaction (putaway or a manual adjustment),
// and never goes below zero.
const inventorySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

    quantity: { type: Number, required: true, default: 0, min: [0, "Stock cannot be negative"] },
  },
  { timestamps: true }
);

inventorySchema.index({ organizationId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("Inventory", inventorySchema);
