const User = require("../models/User");
const { SYSTEM_ROLES } = require("../config/constants");

const REQUIRED_ENV = ["SUPER_ADMIN_NAME", "SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD"];

// Ensures the single system-level System Admin exists. Idempotent: runs on every startup.
// Existence is decided by systemRole, never by an "admin" role. Credentials come from .env
// and are only used when the account is first created (changing .env later does not
// overwrite an existing System Admin).
const createSuperAdmin = async () => {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  // Drops indexes left over from the old single-tenant schema (e.g. global unique email)
  // and builds the organization-scoped ones.
  await User.syncIndexes();

  const existing = await User.findOne({ systemRole: SYSTEM_ROLES.SUPER_ADMIN });
  if (existing) {
    console.log("System Admin already exists");
    return existing;
  }

  try {
    const superAdmin = await User.create({
      name: process.env.SUPER_ADMIN_NAME,
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      systemRole: SYSTEM_ROLES.SUPER_ADMIN,
      isProtected: true,
    });

    console.log("System Admin created successfully");
    return superAdmin;
  } catch (error) {
    if (error.code === 11000) {
      // Either another instance created it a moment ago, or a leftover user from the
      // old system already uses this email.
      const created = await User.findOne({ systemRole: SYSTEM_ROLES.SUPER_ADMIN });
      if (created) return created;

      throw new Error(
        "Cannot create System Admin: a user with SUPER_ADMIN_EMAIL already exists from the old system. Reset the database (see NEW_SYSTEM_FLOW.md)."
      );
    }
    throw error;
  }
};

module.exports = createSuperAdmin;
