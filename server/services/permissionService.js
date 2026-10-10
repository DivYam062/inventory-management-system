const { FULL_ACCESS_ROLE_TYPES } = require("../config/constants");
const { getAllPermissions, isValidPermission } = require("../config/permissions");

// Resolve a role into { resource: [actions] }. Protected roles get everything.
const resolvePermissions = (role) => {
  if (!role) return {};
  if (FULL_ACCESS_ROLE_TYPES.includes(role.type)) return getAllPermissions();

  // Only actions that exist today count (a role saved before an action was retired may still list it).
  return Object.fromEntries(
    role.permissions
      .map((p) => [p.resource, p.actions.filter((action) => isValidPermission(p.resource, action))])
      .filter(([, actions]) => actions.length > 0)
  );
};

const hasPermission = (permissions, resource, action) =>
  Boolean(permissions?.[resource]?.includes(action));

// True when every permission in `candidate` is also held in `holder` (both { resource: [actions] }).
// Used so nobody can hand out, or manage someone who has, more power than they have themselves.
const isSubsetOf = (candidate, holder) =>
  Object.entries(candidate).every(([resource, actions]) =>
    actions.every((action) => hasPermission(holder, resource, action))
  );

module.exports = { resolvePermissions, hasPermission, isSubsetOf };
