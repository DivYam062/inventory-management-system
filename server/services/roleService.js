const Role = require("../models/Role");
const { ROLE_TYPES, ROLE_TYPE_NAMES } = require("../config/constants");

const ensureDefaultRoles = async (organizationId, options = {}) => {
  const roles = {};

  for (const type of [ROLE_TYPES.DEFAULT_ADMIN, ROLE_TYPES.SUPPORT]) {
    let role = await Role.findOne({ organizationId, type }).session(options.session || null);

    if (!role) {
      [role] = await Role.create(
        [{ organizationId, name: ROLE_TYPE_NAMES[type], type, permissions: [] }],
        options
      );
    }

    roles[type] = role;
  }

  return roles;
};

module.exports = { ensureDefaultRoles };
