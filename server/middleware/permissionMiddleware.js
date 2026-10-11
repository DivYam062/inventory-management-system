const { isValidPermission } = require("../config/permissions");
const { hasPermission } = require("../services/permissionService");

const forbidden = (res, message) => res.status(403).json({ success: false, message });

// System-level routes (organization management, system stats). System Admin only.
const requireSuperAdmin = (req, res, next) => {
  if (!req.isSuperAdmin) {
    return forbidden(res, "Access denied. System Admin privileges required.");
  }
  next();
};

// Organization-level routes. System Admin is not an organization user and has no
// organization data access, so it is rejected here too.
const requireOrganization = (req, res, next) => {
  if (req.isSuperAdmin || !req.organizationId) {
    return forbidden(res, "Access denied. Organization access required.");
  }
  next();
};

// Feature + action check, e.g. requirePermission("purchase-order", "create").
// Implies requireOrganization. Unknown resource/action pairs fail at startup, not at request time.
const requirePermission = (resource, action) => {
  if (!isValidPermission(resource, action)) {
    throw new Error(`Unknown permission: ${resource}:${action}`);
  }

  return (req, res, next) =>
    requireOrganization(req, res, () => {
      if (!hasPermission(req.permissions, resource, action)) {
        return forbidden(res, `Access denied. You do not have permission to ${action} ${resource}.`);
      }
      next();
    });
};

// Passes when the user holds at least one of the given [resource, action] pairs.
const requireAnyPermission = (pairs) => {
  pairs.forEach(([resource, action]) => {
    if (!isValidPermission(resource, action)) {
      throw new Error(`Unknown permission: ${resource}:${action}`);
    }
  });

  return (req, res, next) =>
    requireOrganization(req, res, () => {
      if (!pairs.some(([resource, action]) => hasPermission(req.permissions, resource, action))) {
        return forbidden(res, "Access denied. You do not have permission to do this.");
      }
      next();
    });
};

module.exports = { requireSuperAdmin, requireOrganization, requirePermission, requireAnyPermission };
