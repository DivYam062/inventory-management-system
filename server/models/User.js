const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { SYSTEM_ROLES, ENTITY_STATUS } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },

    // Hashed automatically on save (see pre-save hook). Never selected by default.
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    phone: {
      type: String,
      trim: true,
    },

    // Set only for the single system-level Super Admin. Organization users have null.
    systemRole: {
      type: String,
      enum: [...Object.values(SYSTEM_ROLES), null],
      default: null,
    },

    // Organization users belong to exactly one organization; Super Admin belongs to none.
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },

    // System-created organization users (Default Admin, Support) cannot be edited or deleted.
    isProtected: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(ENTITY_STATUS),
      default: ENTITY_STATUS.ACTIVE,
    },
  },
  { timestamps: true }
);

// Email is globally unique: one person belongs to exactly one organization (or is the Super Admin).
// To join another organization, the existing user record has to be removed first.
userSchema.index({ email: 1 }, { unique: true });


// At most one Super Admin can ever exist.
userSchema.index(
  { systemRole: 1 },
  { unique: true, partialFilterExpression: { systemRole: SYSTEM_ROLES.SUPER_ADMIN } }
);

userSchema.pre("validate", function () {
  if (this.systemRole === SYSTEM_ROLES.SUPER_ADMIN) {
    if (this.organizationId || this.roleId) {
      this.invalidate("systemRole", "Super Admin cannot belong to an organization or role");
    }
    return;
  }

  if (!this.organizationId) this.invalidate("organizationId", "Organization is required");
  if (!this.roleId) this.invalidate("roleId", "Role is required");
});

// Runs after validation, so minlength applies to the plain password, then it is hashed.
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
