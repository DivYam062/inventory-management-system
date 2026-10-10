const mongoose = require("mongoose");

const Product = require("../models/Product");
const { CURRENCY_CODES, UNIT_CODES } = require("../config/referenceData");
const { getConfiguration } = require("../services/configurationService");
const { sendSuccess } = require("../utils/response");

// Organization configuration. Permissions: configuration:view to read, configuration:edit to change.
//
// Currencies and units of measurement: the organization chooses which of the system lists it uses. At
// least one of each must stay enabled, and a currency / unit that products still use cannot be removed.

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const serialize = (configuration) => ({
  currencies: configuration.currencies,
  units: configuration.units,
  updatedAt: configuration.updatedAt,
});

// Validates a submitted list of codes against the system list. Returns { codes } or { error }.
const parseCodes = (value, label, validCodes) => {
  if (!Array.isArray(value) || value.some((code) => typeof code !== "string")) {
    return { error: `${label} must be a list of codes` };
  }

  const codes = [...new Set(value)];
  if (codes.length === 0) return { error: `Keep at least one ${label.toLowerCase()} enabled` };

  const unknown = codes.filter((code) => !validCodes.includes(code));
  if (unknown.length > 0) return { error: `Unknown ${label.toLowerCase()}: ${unknown.join(", ")}` };

  return { codes };
};

// Removed codes that products of the organization still use, as [{ code, count }].
const codesInUse = async (organizationId, field, removed) => {
  if (removed.length === 0) return [];

  const rows = await Product.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(String(organizationId)), [field]: { $in: removed } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return rows.map((row) => ({ code: row._id, count: row.count }));
};

const describeInUse = (inUse, label) =>
  `Cannot remove ${inUse.map((row) => `${row.code} (${row.count} product${row.count === 1 ? "" : "s"})`).join(", ")}: still used as ${label}.`;

const getConfigurationHandler = async (req, res) => {
  const configuration = await getConfiguration(req.organizationId);
  return sendSuccess(res, serialize(configuration));
};

const updateConfiguration = async (req, res) => {
  const { currencies, units } = req.body;
  const configuration = await getConfiguration(req.organizationId);

  const updates = {};

  if (currencies !== undefined) {
    const parsed = parseCodes(currencies, "Currency", CURRENCY_CODES);
    if (parsed.error) return fail(res, 400, parsed.error);

    const removed = configuration.currencies.filter((code) => !parsed.codes.includes(code));
    const inUse = await codesInUse(req.organizationId, "currency", removed);
    if (inUse.length > 0) return fail(res, 400, describeInUse(inUse, "a product currency"));

    updates.currencies = CURRENCY_CODES.filter((code) => parsed.codes.includes(code));
  }

  if (units !== undefined) {
    const parsed = parseCodes(units, "Unit", UNIT_CODES);
    if (parsed.error) return fail(res, 400, parsed.error);

    const removed = configuration.units.filter((code) => !parsed.codes.includes(code));
    const inUse = await codesInUse(req.organizationId, "unit", removed);
    if (inUse.length > 0) return fail(res, 400, describeInUse(inUse, "a product unit"));

    updates.units = UNIT_CODES.filter((code) => parsed.codes.includes(code));
  }

  if (Object.keys(updates).length > 0) {
    Object.assign(configuration, updates);
    await configuration.save();
  }

  return sendSuccess(res, serialize(configuration));
};

module.exports = { getConfiguration: getConfigurationHandler, updateConfiguration };
