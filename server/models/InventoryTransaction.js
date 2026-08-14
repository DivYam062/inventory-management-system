const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    type: {
      type: String,
      enum: ["stock-in", "stock-out"],
      required: [true, "Transaction type is required"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    previousStock: {
      type: Number,
      required: [true, "Previous stock is required"],
      min: [0, "Previous stock cannot be negative"],
    },

    newStock: {
      type: Number,
      required: [true, "New stock is required"],
      min: [0, "New stock cannot be negative"],
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performed by is required"],
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const InventoryTransaction = mongoose.model("InventoryTransaction", inventoryTransactionSchema);

module.exports = InventoryTransaction;