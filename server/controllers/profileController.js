const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { serializeUser } = require("../services/authContextService");
const { getConfiguration, serializeModules, serializePurchaseOrderSettings } = require("../services/configurationService");
const { sendSuccess } = require("../utils/response");
const { logAudit, diffFields, describeChanges, AUDIT_ENTITY_TYPES, AUDIT_ACTIONS } = require("../services/auditService");

// Self-service account management for the signed-in user (any role, including the protected
// Network Admin / Support users and the System Admin). Email, role and organization can never be
// changed here - or anywhere else.

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores anything beyond 72 bytes
const MAX_PHONE_LENGTH = 20;
const PHONE_PATTERN = /^[\d+\-\s()]*$/;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Current session context (used by the client to restore a session from a stored token).
const getProfile = async (req, res) => {
  // Organization users also get the on/off state of the receiving modules (the menu and routes follow it).
  const configuration = req.auth.organization ? await getConfiguration(req.auth.organization.id) : null;

  return sendSuccess(res, {
    ...req.auth,
    modules: configuration ? serializeModules(configuration) : undefined,
    purchaseOrder: configuration ? serializePurchaseOrderSettings(configuration) : undefined,
  });
};

// Update your own name and phone number.
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const user = req.user;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return fail(res, 400, "Name is required");
  }

  if (phone !== undefined && phone !== null && phone !== "") {
    if (typeof phone !== "string" || phone.length > MAX_PHONE_LENGTH || !PHONE_PATTERN.test(phone)) {
      return fail(res, 400, `Phone number can only contain digits, spaces, + - ( ) and be at most ${MAX_PHONE_LENGTH} characters`);
    }
  }

  const before = { name: user.name, phone: user.phone };

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;

  await user.save();

  const changes = diffFields(before, user, { name: "Name", phone: "Phone" });
  if (changes.length > 0) {
    await logAudit(req, {
      entityType: AUDIT_ENTITY_TYPES.USER,
      entity: { id: user._id, number: `${user.name} (${user.email})` },
      action: AUDIT_ACTIONS.UPDATED,
      summary: `Updated their own profile (${describeChanges(changes)})`,
      meta: { changes },
    });
  }

  return sendSuccess(res, { user: serializeUser(user, req.auth.user.role) });
};

// Change your own password. The current password is required, so a stolen session alone is not enough.
// All other sessions are signed out (tokens issued before the change stop working) and a fresh token for
// this session is returned.
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || !currentPassword) {
    return fail(res, 400, "Current password is required");
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < MIN_PASSWORD_LENGTH ||
    newPassword.length > MAX_PASSWORD_LENGTH
  ) {
    return fail(res, 400, `New password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`);
  }

  if (currentPassword === newPassword) {
    return fail(res, 400, "New password must be different from the current password");
  }

  const user = await User.findById(req.user._id).select("+password");

  // 400, not 401: a 401 would sign the client out, and this is just a wrong form entry.
  if (!(await user.comparePassword(currentPassword))) {
    return fail(res, 400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  // Only the fact is recorded, never the password.
  await logAudit(req, {
    entityType: AUDIT_ENTITY_TYPES.USER,
    entity: { id: user._id, number: `${user.name} (${user.email})` },
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    summary: `Changed their own password`,
  });

  return sendSuccess(res, { token: generateToken(user._id, user.tokenVersion) });
};

module.exports = { getProfile, updateProfile, changePassword };
