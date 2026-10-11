const Organization = require("../models/Organization");
const User = require("../models/User");
const { ENTITY_STATUS } = require("../config/constants");
const { sendSuccess } = require("../utils/response");

const TREND_MONTHS = 6;
const LIST_LIMIT = 5;

// Organizations created in each of the last TREND_MONTHS calendar months (UTC), oldest first,
// with zero-filled months so the chart axis is always continuous.
const getOrganizationsByMonth = async () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1));

  const grouped = await Organization.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
  ]);

  const countByMonth = new Map(grouped.map((g) => [`${g._id.year}-${String(g._id.month).padStart(2, "0")}`, g.count]));

  return Array.from({ length: TREND_MONTHS }, (_, index) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { month, count: countByMonth.get(month) || 0 };
  });
};

// The organizations with the most users.
const getTopOrganizationsByUsers = async () => {
  const rows = await User.aggregate([
    { $match: { organizationId: { $ne: null } } },
    { $group: { _id: "$organizationId", userCount: { $sum: 1 } } },
    { $sort: { userCount: -1, _id: 1 } },
    { $limit: LIST_LIMIT },
    { $lookup: { from: "organizations", localField: "_id", foreignField: "_id", as: "organization" } },
    { $unwind: "$organization" },
  ]);

  return rows.map((row) => ({
    id: row._id,
    name: row.organization.name,
    logo: row.organization.logo,
    userCount: row.userCount,
  }));
};

const getRecentOrganizations = async () => {
  const organizations = await Organization.find()
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
    .select("name companyRoute status logo createdAt");

  return organizations.map((organization) => ({
    id: organization._id,
    name: organization.name,
    companyRoute: organization.companyRoute,
    status: organization.status,
    logo: organization.logo,
    createdAt: organization.createdAt,
  }));
};

// System-level statistics for the System Admin dashboard.
const getSystemOverview = async (req, res) => {
  const [
    totalOrganizations,
    activeOrganizations,
    totalOrganizationUsers,
    organizationsByMonth,
    topOrganizationsByUsers,
    recentOrganizations,
  ] = await Promise.all([
    Organization.countDocuments(),
    Organization.countDocuments({ status: ENTITY_STATUS.ACTIVE }),
    User.countDocuments({ organizationId: { $ne: null } }),
    getOrganizationsByMonth(),
    getTopOrganizationsByUsers(),
    getRecentOrganizations(),
  ]);

  return sendSuccess(res, {
    totalOrganizations,
    activeOrganizations,
    inactiveOrganizations: totalOrganizations - activeOrganizations,
    totalOrganizationUsers,
    organizationsByMonth,
    topOrganizationsByUsers,
    recentOrganizations,
  });
};

module.exports = { getSystemOverview };
