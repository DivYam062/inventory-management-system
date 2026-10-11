const { getConfiguration } = require("../services/configurationService");

// Refuses the request while the organization has switched the module off in Configuration
// (modules.purchaseOrder / gateEntry / grn). Use after authenticate + requireOrganization:
//   router.use(authenticate, requireOrganization, requireModule("purchaseOrder"));
const MODULE_LABELS = {
  purchaseOrder: "Purchase Order",
  gateEntry: "Gate Entry",
  grn: "GRN",
};

const requireModule = (key) => {
  if (!MODULE_LABELS[key]) throw new Error(`Unknown module: ${key}`);

  return async (req, res, next) => {
    const configuration = await getConfiguration(req.organizationId);

    if (!configuration.modules[key]) {
      return res.status(403).json({
        success: false,
        message: `The ${MODULE_LABELS[key]} module is turned off for your organization.`,
      });
    }

    next();
  };
};

module.exports = { requireModule };
