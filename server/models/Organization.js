const mongoose = require("mongoose");
const { ENTITY_STATUS, RESERVED_COMPANY_ROUTES } = require("../config/constants");

// Phase 1 defines only what authentication needs (identity, company route, status).
// Contact details and branding are added with organization management (Phase 2).
const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },

    // URL segment for this organization's app: /{companyRoute}/dashboard
    companyRoute: {
      type: String,
      required: [true, "Company route is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/,
        "Company route must be 3-32 characters: lowercase letters, numbers or hyphens",
      ],
      validate: {
        validator: (value) => !RESERVED_COMPANY_ROUTES.includes(value),
        message: "This company route is reserved",
      },
    },

    email: {
      type: String,
      required: [true, "Organization email is required"],
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
