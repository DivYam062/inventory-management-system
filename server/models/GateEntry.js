const mongoose = require("mongoose");

const GATE_ENTRY_STATUS = {
  PENDING: "pending", // arrived at the gate, waiting for a GRN
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const GATE_ENTRY_SOURCE = {
  PURCHASE_ORDER: "purchase_order", // against an issued purchase order
  DIRECT: "direct", // against a seller and supplier, with no purchase order
};

// A gate entry records goods arriving at the gate: who brought them, in what vehicle, with which delivery
// document. It has no item lines - the items are recorded by the GRN that follows.
const gateEntrySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    gateEntryNumber: { type: String, required: true },

    source: { type: String, enum: Object.values(GATE_ENTRY_SOURCE), required: true },

    purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },

    arrivalAt: { type: Date, required: true },

    vehicleNumber: { type: String, trim: true, uppercase: true, maxlength: [20, "Vehicle number must be at most 20 characters"] },

    driverName: { type: String, trim: true, maxlength: [100, "Driver name must be at most 100 characters"] },

    driverPhone: { type: String, trim: true, maxlength: [20, "Driver phone must be at most 20 characters"] },

    challanNumber: { type: String, trim: true, maxlength: [50, "Challan number must be at most 50 characters"] },

    packages: { type: Number, min: [1, "Packages must be at least 1"] },

    notes: { type: String, trim: true, maxlength: [500, "Notes must be at most 500 characters"] },

    status: {
      type: String,
      enum: Object.values(GATE_ENTRY_STATUS),
      default: GATE_ENTRY_STATUS.PENDING,
      index: true,
    },

    cancelledAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

gateEntrySchema.index({ organizationId: 1, gateEntryNumber: 1 }, { unique: true });

const GateEntry = mongoose.model("GateEntry", gateEntrySchema);

module.exports = GateEntry;
module.exports.GATE_ENTRY_STATUS = GATE_ENTRY_STATUS;
module.exports.GATE_ENTRY_SOURCE = GATE_ENTRY_SOURCE;
