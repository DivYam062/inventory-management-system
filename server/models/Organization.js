const mongoose = require("mongoose");
const { ENTITY_STATUS, RESERVED_COMPANY_ROUTES, DEFAULT_BRANDING } = require("../config/constants");

const hexColor = (label) => ({
  type: String,
  trim: true,
  match: [/^#[0-9a-fA-F]{6}$/, `${label} must be a hex color like #2563eb`],
});

const brandingSchema = new mongoose.Schema(
  {
    useCustomColors: { type: Boolean, default: false },
    primary: { ...hexColor("Primary color"), default: DEFAULT_BRANDING.primary },
    primaryLight: { ...hexColor("Primary light color"), default: DEFAULT_BRANDING.primaryLight },
    primaryLighter: { ...hexColor("Primary lighter color"), default: DEFAULT_BRANDING.primaryLighter },
    primaryDark: { ...hexColor("Primary dark color"), default: DEFAULT_BRANDING.primaryDark },
  },
  { _id: false }
);

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },

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
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
    },

    phone: {
      type: String,
      trim: true,
    },

    logo: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      trim: true,
    },

    branding: {
      type: brandingSchema,
      default: () => ({}),
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
