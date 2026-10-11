// System-level authorization layer (never an organization Role document).
const SYSTEM_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
};

// Organization-level role types.
const ROLE_TYPES = {
  DEFAULT_ADMIN: "DEFAULT_ADMIN",
  SUPPORT: "SUPPORT",
  CUSTOM: "CUSTOM",
};

// Protected role types always have every permission and cannot be edited or deleted.
const FULL_ACCESS_ROLE_TYPES = [ROLE_TYPES.DEFAULT_ADMIN, ROLE_TYPES.SUPPORT];

const ROLE_TYPE_NAMES = {
  [ROLE_TYPES.DEFAULT_ADMIN]: "Network Admin",
  [ROLE_TYPES.SUPPORT]: "Support",
};

const ENTITY_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// First path segment is the company route (/{companyRoute}/dashboard), so it must never
// collide with a fixed app route.
const RESERVED_COMPANY_ROUTES = [
  "login", "logout", "unauthorized", "super-admin", "api", "uploads", "admin", "dashboard", "assets", "static",
];

// System default brand colors, used when an organization has useCustomColors turned off.
// Keep in sync with client/src/utils/branding.js.
const DEFAULT_BRANDING = {
  primary: "#2563eb",
  primaryLight: "#60a5fa",
  primaryLighter: "#dbeafe",
  primaryDark: "#1d4ed8",
};

module.exports = {
  DEFAULT_BRANDING,
  RESERVED_COMPANY_ROUTES,
  SYSTEM_ROLES,
  ROLE_TYPES,
  FULL_ACCESS_ROLE_TYPES,
  ROLE_TYPE_NAMES,
  ENTITY_STATUS,
};
