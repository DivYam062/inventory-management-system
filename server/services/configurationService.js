const Configuration = require("../models/Configuration");

// The organization's configuration, created with defaults (everything enabled) on first use.
const getConfiguration = (organizationId) =>
  Configuration.findOneAndUpdate(
    { organizationId },
    { $setOnInsert: { organizationId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

module.exports = { getConfiguration };
