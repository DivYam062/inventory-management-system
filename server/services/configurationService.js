const Configuration = require("../models/Configuration");
const { CURRENCIES, UNITS } = require("../config/referenceData");

// The organization's configuration, created with defaults (everything enabled) on first use.
const getConfiguration = (organizationId) =>
  Configuration.findOneAndUpdate(
    { organizationId },
    { $setOnInsert: { organizationId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

const serializeModules = (configuration) => ({
  purchaseOrder: configuration.modules.purchaseOrder,
  gateEntry: configuration.modules.gateEntry,
  grn: configuration.modules.grn,
});

const serializePurchaseOrderSettings = (configuration) => ({
  allowOverReceiving: configuration.purchaseOrder.allowOverReceiving,
});

const CUSTOM_UNIT_GROUP = "Custom";

// Everything the organization can choose from: the system lists followed by its own custom entries.
// Each item: { code, name, symbol? / group, isCustom }.
const getCatalog = (configuration) => ({
  currencies: [
    ...CURRENCIES.map((c) => ({ ...c, isCustom: false })),
    ...configuration.customCurrencies.map((c) => ({ code: c.code, name: c.name, symbol: c.symbol || c.code, isCustom: true })),
  ],
  units: [
    ...UNITS.map((u) => ({ ...u, isCustom: false })),
    ...configuration.customUnits.map((u) => ({ code: u.code, name: u.name, group: CUSTOM_UNIT_GROUP, isCustom: true })),
  ],
});

module.exports = { getConfiguration, getCatalog, serializeModules, serializePurchaseOrderSettings };
