const mongoose = require("mongoose");
const { ENTITY_STATUS } = require("../config/constants");

// A Product is made under a Seller and belongs to a Category. It carries no stock quantity: stock lives
// in Inventory (putaway and manual adjustments), so every change to it is recorded.
const productSchema = new mongoose.Schema(
  {
    // Every product belongs to exactly one organization and is invisible to all others.
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [150, "Product name must be at most 150 characters"],
    },

    // Stock keeping unit, stored uppercase. Unique per organization, ignoring case.
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
      uppercase: true,
      maxlength: [50, "SKU must be at most 50 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be at most 1000 characters"],
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: [true, "Seller is required"],
      index: true,
    },

    // Unit price. Optional; when set it has a currency (a code from GET /api/currencies).
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },

    // Codes come from the organization's enabled currencies / units (system list or its own custom ones),
    // which the controller checks.
    currency: {
      type: String,
      trim: true,
      uppercase: true,
    },

    // Unit of measurement the product is stocked, bought and counted in (a code from GET /api/units).
    unit: {
      type: String,
      required: [true, "Unit of measurement is required"],
      trim: true,
      uppercase: true,
    },

    // Public path of the uploaded image (e.g. "/uploads/products/123.png"), or null. Optional.
    image: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

productSchema.index({ organizationId: 1, sku: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("Product", productSchema);
