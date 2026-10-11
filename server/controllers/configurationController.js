const mongoose = require("mongoose");

const Product = require("../models/Product");
const { CURRENCY_CODES, UNIT_CODES } = require("../config/referenceData");
const { getConfiguration, getCatalog, serializeModules } = require("../services/configurationService");
const { sendSuccess } = require("../utils/response");

// Organization configuration. Permissions: configuration:view to read, configuration:edit to change.
//
// Currencies and units of measurement: the organization chooses which of the system lists it uses and can
// add its own. At least one of each must stay enabled, and a currency / unit that products still use
// cannot be switched off or deleted. System entries can only be switched off; custom ones can be deleted.

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,9}$/;

const serialize = (configuration) => ({
  modules: serializeModules(configuration),
  purchaseOrder: { allowOverReceiving: configuration.purchaseOrder.allowOverReceiving },
  currencies: configuration.currencies,
  units: configuration.units,
  customCurrencies: configuration.customCurrencies.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol })),
  customUnits: configuration.customUnits.map((u) => ({ code: u.code, name: u.name })),
  updatedAt: configuration.updatedAt,
});

// Validates a submitted list of codes against what the organization can choose from.
// Returns { codes } or { error }.
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

// Codes among `codes` that products of the organization still use, as [{ code, count }].
const codesInUse = async (organizationId, field, codes) => {
  if (codes.length === 0) return [];

  const rows = await Product.aggregate([
    { $match: { organizationId: new mongoose.Types.ObjectId(String(organizationId)), [field]: { $in: codes } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  return rows.map((row) => ({ code: row._id, count: row.count }));
};

const describeInUse = (inUse, action, label) =>
  `Cannot ${action} ${inUse.map((row) => `${row.code} (${row.count} product${row.count === 1 ? "" : "s"})`).join(", ")}: still used as ${label}.`;

const getConfigurationHandler = async (req, res) => {
  const configuration = await getConfiguration(req.organizationId);
  return sendSuccess(res, serialize(configuration));
};

const MODULE_KEYS = ["purchaseOrder", "gateEntry", "grn"];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const updateConfiguration = async (req, res) => {
  const { currencies, units, modules, purchaseOrder } = req.body;
  const configuration = await getConfiguration(req.organizationId);
  const catalog = getCatalog(configuration);

  const updates = {};

  if (modules !== undefined) {
    if (!isPlainObject(modules)) return fail(res, 400, "Modules must be an object");

    for (const [key, value] of Object.entries(modules)) {
      if (!MODULE_KEYS.includes(key)) return fail(res, 400, `Unknown module: ${key}`);
      if (typeof value !== "boolean") return fail(res, 400, `Module ${key} must be true or false`);
    }
  }

  if (purchaseOrder !== undefined) {
    if (!isPlainObject(purchaseOrder)) return fail(res, 400, "Purchase order settings must be an object");

    for (const [key, value] of Object.entries(purchaseOrder)) {
      if (key !== "allowOverReceiving") return fail(res, 400, `Unknown purchase order setting: ${key}`);
      if (typeof value !== "boolean") return fail(res, 400, "allowOverReceiving must be true or false");
    }
  }

  if (currencies !== undefined) {
    const allCodes = catalog.currencies.map((c) => c.code);
    const parsed = parseCodes(currencies, "Currency", allCodes);
    if (parsed.error) return fail(res, 400, parsed.error);

    const removed = configuration.currencies.filter((code) => !parsed.codes.includes(code));
    const inUse = await codesInUse(req.organizationId, "currency", removed);
    if (inUse.length > 0) return fail(res, 400, describeInUse(inUse, "remove", "a product currency"));

    updates.currencies = allCodes.filter((code) => parsed.codes.includes(code));
  }

  if (units !== undefined) {
    const allCodes = catalog.units.map((u) => u.code);
    const parsed = parseCodes(units, "Unit", allCodes);
    if (parsed.error) return fail(res, 400, parsed.error);

    const removed = configuration.units.filter((code) => !parsed.codes.includes(code));
    const inUse = await codesInUse(req.organizationId, "unit", removed);
    if (inUse.length > 0) return fail(res, 400, describeInUse(inUse, "remove", "a product unit"));

    updates.units = allCodes.filter((code) => parsed.codes.includes(code));
  }

  // Partial updates: only the keys that were sent change.
  if (modules) {
    Object.entries(modules).forEach(([key, value]) => {
      configuration.modules[key] = value;
    });
  }

  if (purchaseOrder && purchaseOrder.allowOverReceiving !== undefined) {
    configuration.purchaseOrder.allowOverReceiving = purchaseOrder.allowOverReceiving;
  }

  Object.assign(configuration, updates);
  await configuration.save();

  return sendSuccess(res, serialize(configuration));
};

// Shared by the add endpoints. Returns an error message for a bad code / name, otherwise null.
const entryError = (code, name, takenCodes, label) => {
  if (typeof code !== "string" || !code.trim()) return `${label} code is required`;
  if (!CODE_PATTERN.test(code.trim().toUpperCase())) {
    return `${label} code must be 1-10 letters or numbers (A-Z, 0-9, - or _)`;
  }
  if (takenCodes.includes(code.trim().toUpperCase())) return `${label} code ${code.trim().toUpperCase()} already exists`;

  if (typeof name !== "string" || !name.trim()) return `${label} name is required`;
  if (name.trim().length > 50) return `${label} name must be at most 50 characters`;

  return null;
};

const addCurrency = async (req, res) => {
  const { code, name, symbol } = req.body;
  const configuration = await getConfiguration(req.organizationId);
  const taken = getCatalog(configuration).currencies.map((c) => c.code);

  const problem = entryError(code, name, taken, "Currency");
  if (problem) return fail(res, 400, problem);
  if (symbol !== undefined && symbol !== null && (typeof symbol !== "string" || symbol.trim().length > 5)) {
    return fail(res, 400, "Symbol must be at most 5 characters");
  }

  const upperCode = code.trim().toUpperCase();
  configuration.customCurrencies.push({ code: upperCode, name: name.trim(), symbol: symbol ? symbol.trim() : undefined });
  configuration.currencies.push(upperCode); // a new currency is enabled right away
  await configuration.save();

  return sendSuccess(res, serialize(configuration), { status: 201 });
};

const addUnit = async (req, res) => {
  const { code, name } = req.body;
  const configuration = await getConfiguration(req.organizationId);
  const taken = getCatalog(configuration).units.map((u) => u.code);

  const problem = entryError(code, name, taken, "Unit");
  if (problem) return fail(res, 400, problem);

  const upperCode = code.trim().toUpperCase();
  configuration.customUnits.push({ code: upperCode, name: name.trim() });
  configuration.units.push(upperCode);
  await configuration.save();

  return sendSuccess(res, serialize(configuration), { status: 201 });
};

// Builds the delete handler for custom currencies / units.
const deleteCustom = ({ customKey, enabledKey, productField, label, inUseLabel, systemCodes }) => async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const configuration = await getConfiguration(req.organizationId);

  if (systemCodes.includes(code)) {
    return fail(res, 400, `${label} ${code} is a system ${label.toLowerCase()} and cannot be deleted. Switch it off instead.`);
  }
  if (!configuration[customKey].some((entry) => entry.code === code)) {
    return fail(res, 404, `${label} not found`);
  }

  const inUse = await codesInUse(req.organizationId, productField, [code]);
  if (inUse.length > 0) return fail(res, 400, describeInUse(inUse, "delete", inUseLabel));

  // Deleting the only enabled entry would leave nothing to choose from.
  const remainingEnabled = configuration[enabledKey].filter((enabledCode) => enabledCode !== code);
  if (remainingEnabled.length === 0) return fail(res, 400, `Keep at least one ${label.toLowerCase()} enabled`);

  configuration[customKey] = configuration[customKey].filter((entry) => entry.code !== code);
  configuration[enabledKey] = remainingEnabled;
  await configuration.save();

  return sendSuccess(res, serialize(configuration));
};

const deleteCurrency = deleteCustom({
  customKey: "customCurrencies",
  enabledKey: "currencies",
  productField: "currency",
  label: "Currency",
  inUseLabel: "a product currency",
  systemCodes: CURRENCY_CODES,
});

const deleteUnit = deleteCustom({
  customKey: "customUnits",
  enabledKey: "units",
  productField: "unit",
  label: "Unit",
  inUseLabel: "a product unit",
  systemCodes: UNIT_CODES,
});

module.exports = {
  getConfiguration: getConfigurationHandler,
  updateConfiguration,
  addCurrency,
  deleteCurrency,
  addUnit,
  deleteUnit,
};
