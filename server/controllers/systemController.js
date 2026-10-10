const Organization = require("../models/Organization");
const User = require("../models/User");
const { ENTITY_STATUS } = require("../config/constants");

// System-level statistics for the Super Admin dashboard.
const getSystemOverview = async (req, res) => {
  const [totalOrganizations, activeOrganizations, totalOrganizationUsers] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ status: ENTITY_STATUS.ACTIVE }),
    User.countDocuments({ organizationId: { $ne: null } }),
  ]);

  return res.status(200).json({
    success: true,
    overview: {
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations: totalOrganizations - activeOrganizations,
      totalOrganizationUsers,
    },
  });
};

module.exports = { getSystemOverview };
