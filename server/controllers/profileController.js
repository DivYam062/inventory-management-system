const { serializeUser } = require("../services/authContextService");
const { sendSuccess } = require("../utils/response");

// Current session context (used by the client to restore a session from a stored token).
const getProfile = async (req, res) => {
  return sendSuccess(res, req.auth);
};

// Users may update their own display name and phone. Email, role and organization
// are never editable here.
const updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;

  await user.save();

  return sendSuccess(res, { user: serializeUser(user, req.auth.user.role) });
};

module.exports = { getProfile, updateProfile };
