const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  unit: { type: String, required: true },
  quantity: { type: Number, required: true, min: [0.001, "Quantity must be greater than 0"] },
});

// A putaway moves the passed quantity of a GRN into inventory. Each one is a permanent record: stock that was
// put away is corrected later with a manual adjustment, never by deleting the putaway.
const putawaySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    putawayNumber: { type: String, required: true },

    grnId: { type: mongoose.Schema.Types.ObjectId, ref: "Grn", required: true, index: true },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },

    putawayAt: { type: Date, required: true },

    items: { type: [itemSchema], validate: [(items) => items.length > 0, "Add at least one item"] },

    notes: { type: String, trim: true, maxlength: [500, "Notes must be at most 500 characters"] },

    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

putawaySchema.index({ organizationId: 1, putawayNumber: 1 }, { unique: true });
putawaySchema.index({ "items.productId": 1 });

module.exports = mongoose.model("Putaway", putawaySchema);
