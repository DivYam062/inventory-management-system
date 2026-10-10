const mongoose = require("mongoose");
const { ROLE_TYPES, FULL_ACCESS_ROLE_TYPES } = require("../config/constants");
const { RESOURCES, isValidPermission } = require("../config/permissions");

const permissionSchema = new mongoose.Schema(
  {
    resource: { type: String, enum: RESOURCES, required: true },
    actions: { type: [String], default: [] },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },

    type: {
      type: String,
      enum: Object.values(ROLE_TYPES),
      default: ROLE_TYPES.CUSTOM,
    },

    // Only used by CUSTOM roles. Protected roles resolve to "all permissions" in code
    // so newly added resources never leave them behind.
    permissions: {
      type: [permissionSchema],
      default: [],
      validate: {
        validator: (permissions) =>
          permissions.every((p) => p.actions.every((action) => isValidPermission(p.resource, action))),
        message: "Role contains an invalid permission",
      },
    },
  },
  { timestamps: true }
);

roleSchema.index({ organizationId: 1, name: 1 }, { unique: true });

roleSchema.virtual("isProtected").get(function () {
  return FULL_ACCESS_ROLE_TYPES.includes(this.type);
});

module.exports = mongoose.model("Role", roleSchema);
