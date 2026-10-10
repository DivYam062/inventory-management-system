const Role = require("../models/Role");
const Organization = require("../models/Organization");
const { SYSTEM_ROLES } = require("../config/constants");
const { resolvePermissions } = require("./permissionService");

const serializeUser = (user, role) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  isProtected: user.isProtected,
  systemRole: user.systemRole,
  role: role ? { id: role._id, name: role.name, type: role.type } : null,
});

// The authorization context for a user: who they are, which organization they act in
// and what they may do. Shared by login, session restore and the auth middleware.
// Returns null when an organization user's role or organization no longer exists.
const buildAuthContext = async (user) => {
  if (user.systemRole === SYSTEM_ROLES.SUPER_ADMIN) {
    return {
      user: serializeUser(user, null),
      organization: null,
      isSuperAdmin: true,
      permissions: {},
    };
  }

  const [role, organization] = await Promise.all([
    Role.findOne({ _id: user.roleId, organizationId: user.organizationId }),
    Organization.findById(user.organizationId),
  ]);

  if (!role || !organization) return null;

  return {
    user: serializeUser(user, role),
    organization: {
      id: organization._id,
      name: organization.name,
      logo: organization.logo,
      companyRoute: organization.companyRoute,
      status: organization.status,
    },
    isSuperAdmin: false,
    permissions: resolvePermissions(role),
  };
};

module.exports = { buildAuthContext, serializeUser };
