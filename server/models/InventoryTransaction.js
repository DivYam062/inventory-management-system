const mongoose = require("mongoose");

const INVENTORY_SOURCE = {
  PUTAWAY: "putaway", // passed goods put away from a GRN
  MANUAL_ADJUSTMENT: "manual_adjustment", // a manual increase / decrease with a reason (Inventory page)
};

// The history of every stock change: what the quantity was, how much it changed by and what it became.
// Rows are only ever added, never edited or removed.
const inventoryTransactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    previousQty: { type: Number, required: true, min: 0 },

    // Positive for an increase, negative for a decrease.
    changedQty: { type: Number, required: true },

    newQty: { type: Number, required: true, min: 0 },

    source: { type: String, enum: Object.values(INVENTORY_SOURCE), required: true },

    // Required for a manual adjustment.
    reason: { type: String, trim: true, maxlength: [200, "Reason must be at most 200 characters"] },

    // The document behind the change (the putaway), kept readable even if it is renamed later.
    refType: { type: String },
    refId: { type: mongoose.Schema.Types.ObjectId },
    refNumber: { type: String },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const InventoryTransaction = mongoose.model("InventoryTransaction", inventoryTransactionSchema);

module.exports = InventoryTransaction;
module.exports.INVENTORY_SOURCE = INVENTORY_SOURCE;
