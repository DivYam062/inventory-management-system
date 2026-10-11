const mongoose = require("mongoose");

const PURCHASE_ORDER_STATUS = {
  DRAFT: "draft", // being prepared; can be edited and deleted
  ISSUED: "issued", // sent to the seller; goods can now be received against it
  PARTIALLY_RECEIVED: "partially_received", // set by GRN (later phase)
  RECEIVED: "received", // set by GRN (later phase)
  CANCELLED: "cancelled",
};

const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: [0.001, "Quantity must be greater than 0"] },
  // The product's unit of measurement when the order was made (a later change to the product does not
  // rewrite old orders).
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: [0, "Price cannot be negative"] },
  // How much of the item has been received so far. Updated by GRN (later phase).
  receivedQuantity: { type: Number, default: 0, min: 0 },
});

// A purchase order is raised to one Seller, through one of its Suppliers, for products made under that
// seller. All amounts are in the order's currency.
const purchaseOrderSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    // Running number per organization, e.g. PO-00001.
    poNumber: { type: String, required: true },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },

    orderDate: { type: Date, required: true },

    expectedDate: { type: Date },

    // Currency code (system list or the organization's own), enabled in Configuration when chosen.
    currency: { type: String, required: true, trim: true, uppercase: true },

    // Whether this order may receive more of an item than it asked for. Can only be turned on while the
    // organization allows over-receiving (Configuration); GRN checks both when it is built.
    allowOverReceiving: { type: Boolean, default: false },

    notes: { type: String, trim: true, maxlength: [500, "Notes must be at most 500 characters"] },

    items: { type: [itemSchema], validate: [(items) => items.length > 0, "Add at least one item"] },

    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: Object.values(PURCHASE_ORDER_STATUS),
      default: PURCHASE_ORDER_STATUS.DRAFT,
      index: true,
    },

    issuedAt: { type: Date },

    cancelledAt: { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ organizationId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ "items.productId": 1 });

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

module.exports = PurchaseOrder;
module.exports.PURCHASE_ORDER_STATUS = PURCHASE_ORDER_STATUS;
