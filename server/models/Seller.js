const mongoose = require("mongoose");
const { ENTITY_STATUS } = require("../config/constants");

// A Seller is an external seller organization the buying organization purchases from. (Suppliers are the
// people who belong to a Seller; products and purchase orders are made on the basis of the Seller.)
const sellerSchema = new mongoose.Schema(
  {
    // Every seller belongs to exactly one organization and is invisible to all others.
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Seller name is required"],
      trim: true,
      maxlength: [100, "Seller name must be at most 100 characters"],
    },

    // Required for every new seller. Sellers saved before it was required may lack one and stay editable
    // (e.g. to switch them inactive) until an email is sent.
    email: {
      type: String,
      required: [
        function () {
          return this.isNew;
        },
        "Seller email is required",
      ],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number must be at most 20 characters"],
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address must be at most 300 characters"],
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

// Names are unique per organization, ignoring case.
sellerSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Seller", sellerSchema);
