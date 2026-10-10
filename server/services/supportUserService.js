const User = require("../models/User");
const Organization = require("../models/Organization");
const { ROLE_TYPES } = require("../config/constants");
const { ensureDefaultRoles } = require("./roleService");

// Every organization gets one protected Support user. Its name and password come from .env
// (SUPPORT_USER_NAME / SUPPORT_USER_EMAIL / SUPPORT_USER_PASSWORD). Emails are globally unique, so the
// address is derived per organization using plus-addressing:
//
//   SUPPORT_USER_EMAIL=support@example.com  +  company route "acme"  ->  support+acme@example.com
//
// Mail sent to that address still reaches the support@example.com inbox on providers that support
// plus-addressing. The password from .env is used when the account is created (changing it later in
// .env does not change existing Support users).

const SUPPORT_NOT_CONFIGURED_MESSAGE =
  "The Support user is not configured on the server. Set SUPPORT_USER_NAME, SUPPORT_USER_EMAIL and SUPPORT_USER_PASSWORD in .env.";

// Returns { name, email, password } for the organization with this company route, or null when the
// server is not configured for it.
const getSupportCredentials = (companyRoute) => {
  const name = process.env.SUPPORT_USER_NAME?.trim();
  const baseEmail = process.env.SUPPORT_USER_EMAIL?.trim();
  const password = process.env.SUPPORT_USER_PASSWORD;

  if (!name || !baseEmail || !password) return null;

  const at = baseEmail.lastIndexOf("@");
  if (at < 1) return null;

  // Ignore any "+tag" already present so the result is always <local>+<companyRoute>@<domain>.
  const local = baseEmail.slice(0, at).split("+")[0];
  const domain = baseEmail.slice(at);

  return { name, password, email: `${local}+${companyRoute}${domain}`.toLowerCase() };
};

const isSupportConfigured = () => getSupportCredentials("x") !== null;

// Creates the organization's Support user. `roles` is the result of ensureDefaultRoles().
const createSupportUser = (organization, roles, credentials) =>
  User.create({
    name: credentials.name,
    email: credentials.email,
    password: credentials.password,
    organizationId: organization._id,
    roleId: roles[ROLE_TYPES.SUPPORT]._id,
    isProtected: true,
  });

// Startup backfill: gives every existing organization that has no Support user one. Idempotent, and it
// never fails the server: a missing configuration or an address that is already taken is only logged.
const ensureSupportUsers = async () => {
  if (!isSupportConfigured()) {
    console.warn("Support users not created: SUPPORT_USER_NAME, SUPPORT_USER_EMAIL and SUPPORT_USER_PASSWORD are not all set.");
    return;
  }

  const organizations = await Organization.find();

  for (const organization of organizations) {
    const roles = await ensureDefaultRoles(organization._id);

    const exists = await User.exists({ organizationId: organization._id, roleId: roles[ROLE_TYPES.SUPPORT]._id });
    if (exists) continue;

    const credentials = getSupportCredentials(organization.companyRoute);

    if (await User.exists({ email: credentials.email })) {
      console.warn(`Support user not created for "${organization.name}": ${credentials.email} is already in use.`);
      continue;
    }

    try {
      await createSupportUser(organization, roles, credentials);
      console.log(`Support user created for "${organization.name}" (${credentials.email})`);
    } catch (error) {
      console.error(`Support user not created for "${organization.name}": ${error.message}`);
    }
  }
};

module.exports = {
  SUPPORT_NOT_CONFIGURED_MESSAGE,
  getSupportCredentials,
  isSupportConfigured,
  createSupportUser,
  ensureSupportUsers,
};
