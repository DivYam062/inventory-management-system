const { FULL_ACCESS_ROLE_TYPES } = require("../config/constants");
const { getAllPermissions } = require("../config/permissions");

// Resolve a role into { resource: [actions] }. Protected roles get everything.
const resolvePermissions = (role) => {
  if (!role) return {};
  if (FULL_ACCESS_ROLE_TYPES.includes(role.type)) return getAllPermissions();

  return Object.fromEntries(
    role.permissions.filter((p) => p.actions.length > 0).map((p) => [p.resource, [...p.actions]])
  );
};

const hasPermission = (permissions, resource, action) =>
  Boolean(permissions?.[resource]?.includes(action));

module.exports = { resolvePermissions, hasPermission };
