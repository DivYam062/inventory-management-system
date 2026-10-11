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
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email address"],
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

    systemRole: {
      type: String,
      enum: [...Object.values(SYSTEM_ROLES), null],
      default: null,
    },

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

    // Goes up by one whenever an existing user's password changes. Every token carries the version it was
    // issued under, so a password change signs out all earlier sessions.
    tokenVersion: { type: Number, default: 0 },

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

// Email is globally unique: one person belongs to exactly one organization (or is the System Admin).
// To join another organization, the existing user record has to be removed first.
userSchema.index({ email: 1 }, { unique: true });

userSchema.index(
  { systemRole: 1 },
  { unique: true, partialFilterExpression: { systemRole: SYSTEM_ROLES.SUPER_ADMIN } }
);

userSchema.pre("validate", function () {
  if (this.systemRole === SYSTEM_ROLES.SUPER_ADMIN) {
    if (this.organizationId || this.roleId) {
      this.invalidate("systemRole", "System Admin cannot belong to an organization or role");
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
    if (!this.isNew) this.tokenVersion = (this.tokenVersion ?? 0) + 1;
  }
});

userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
