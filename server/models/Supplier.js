const mongoose = require("mongoose");
const { ENTITY_STATUS } = require("../config/constants");

// A Supplier is a person who works for a Seller (the person to deal with on purchase orders and
// deliveries). A supplier works under at most ONE seller at a time: `sellerId` is that seller, or null
// while the supplier is unassigned. To move to another seller the supplier is unassigned first.
// Suppliers are contact records, not login accounts.
const supplierSchema = new mongoose.Schema(
  {
    // Every supplier belongs to exactly one organization and is invisible to all others.
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [100, "Supplier name must be at most 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Supplier email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number must be at most 20 characters"],
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

// The email identifies the person, so it is unique per organization: the same person cannot be entered
// twice and end up working under two sellers.
supplierSchema.index({ organizationId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("Supplier", supplierSchema);
