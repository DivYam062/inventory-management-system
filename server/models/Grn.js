const mongoose = require("mongoose");

const GRN_STATUS = {
  PENDING_INSPECTION: "pending_inspection", // goods received, passed / failed not decided yet
  INSPECTED: "inspected", // passed / failed recorded (a GRN with nothing passed ends here)
  PUTAWAY_PARTIAL: "putaway_partial", // set by Putaway (later phase)
  PUTAWAY_COMPLETE: "putaway_complete", // set by Putaway (later phase)
  CANCELLED: "cancelled",
};

const GRN_SOURCE = {
  GATE_ENTRY: "gate_entry", // goods that arrived on a gate entry
  PURCHASE_ORDER: "purchase_order", // against a purchase order, no gate entry
  DIRECT: "direct", // against a seller and supplier only
};

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  // The product's unit of measurement when the GRN was made.
  unit: { type: String, required: true },
  // What the purchase order asked for (null when there is no purchase order).
  orderedQty: { type: Number, default: null },
  // What arrived. receivedQty = passedQty + failedQty once inspected.
  receivedQty: { type: Number, required: true, min: [0.001, "Received quantity must be greater than 0"] },
  passedQty: { type: Number, default: 0, min: 0 },
  failedQty: { type: Number, default: 0, min: 0 },
  // How much of the passed quantity has been put away into inventory (Putaway, later phase).
  putawayQty: { type: Number, default: 0, min: 0 },
  remarks: { type: String, trim: true, maxlength: [200, "Remarks must be at most 200 characters"] },
});

// A goods received note: what actually arrived, then what passed or failed inspection. Only the passed
// quantity can be put away into inventory.
const grnSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    // Running number per organization, e.g. GRN-00001.
    grnNumber: { type: String, required: true },

    source: { type: String, enum: Object.values(GRN_SOURCE), required: true },

    // gate_entry: the entry (and its purchase order, if it had one). purchase_order: the order.
    gateEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "GateEntry", index: true },
    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },

    receivedAt: { type: Date, required: true },

    // The supplier's delivery challan / invoice number (copied from the gate entry when there is one).
    challanNumber: { type: String, trim: true, maxlength: [50, "Challan number must be at most 50 characters"] },

    notes: { type: String, trim: true, maxlength: [500, "Notes must be at most 500 characters"] },

    items: { type: [itemSchema], validate: [(items) => items.length > 0, "Add at least one item"] },

    status: {
      type: String,
      enum: Object.values(GRN_STATUS),
      default: GRN_STATUS.PENDING_INSPECTION,
      index: true,
    },

    inspectedAt: { type: Date },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

grnSchema.index({ organizationId: 1, grnNumber: 1 }, { unique: true });
grnSchema.index({ "items.productId": 1 });

const Grn = mongoose.model("Grn", grnSchema);

module.exports = Grn;
module.exports.GRN_STATUS = GRN_STATUS;
module.exports.GRN_SOURCE = GRN_SOURCE;
