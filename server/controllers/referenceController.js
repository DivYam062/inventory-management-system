const { CURRENCIES, UNITS } = require("../config/referenceData");
const { getConfiguration } = require("../services/configurationService");
const { hasPermission } = require("../services/permissionService");
const { sendSuccess, buildMeta } = require("../utils/response");

// Reference lists for dropdowns. Same query contract as every dropdown endpoint: `search`, `page`, `limit`
// (a page of results plus `meta`).
//
// An organization user gets only what the organization has enabled in its configuration (every item
// carries isEnabled: true). `scope=all` returns the whole system list with isEnabled set per item, for the
// configuration page; it needs configuration:view. Super Admin (no organization) gets the whole list.

const paginate = (items, fields, configKey) => async (req, res) => {
  const { search, page, limit, scope } = req.query;

  let enabled = null; // null = no organization, everything is enabled
  if (req.organizationId) {
    enabled = (await getConfiguration(req.organizationId))[configKey];
  }

  const wantsAll = scope === "all";
  if (wantsAll && req.organizationId && !hasPermission(req.permissions, "configuration", "view")) {
    return res.status(403).json({ success: false, message: "Access denied. You do not have permission to view configuration." });
  }

  let results = items.map((item) => ({ ...item, isEnabled: enabled ? enabled.includes(item.code) : true }));
  if (!wantsAll) results = results.filter((item) => item.isEnabled);

  if (typeof search === "string" && search.trim()) {
    const term = search.trim().toLowerCase();
    results = results.filter((item) => fields.some((field) => String(item[field]).toLowerCase().includes(term)));
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 40, 1), 100);
  const start = (pageNum - 1) * limitNum;

  return sendSuccess(res, results.slice(start, start + limitNum), {
    meta: buildMeta({ page: pageNum, limit: limitNum, total: results.length }),
  });
};

const getCurrencies = paginate(CURRENCIES, ["code", "name"], "currencies");
const getUnits = paginate(UNITS, ["code", "name", "group"], "units");

module.exports = { getCurrencies, getUnits };
