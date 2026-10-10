const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { ENTITY_STATUS } = require("../config/constants");
const { buildAuthContext } = require("../services/authContextService");
const { sendSuccess } = require("../utils/response");

// Login for the Super Admin and all organization users. Emails are globally unique, so the
// email alone identifies the account (and therefore the organization).
// All credential failures return the same message so accounts cannot be probed.
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const invalidCredentials = () =>
    res.status(401).json({ success: false, message: "Invalid credentials" });

  const filter = { email: email.trim().toLowerCase() };

  const user = await User.findOne(filter).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return invalidCredentials();
  }

  if (user.status !== ENTITY_STATUS.ACTIVE) {
    return res.status(403).json({ success: false, message: "Your account is inactive" });
  }

  const auth = await buildAuthContext(user);

  if (!auth) {
    return res.status(403).json({ success: false, message: "Your organization or role is unavailable" });
  }

  if (auth.organization && auth.organization.status !== ENTITY_STATUS.ACTIVE) {
    return res.status(403).json({ success: false, message: "Your organization is inactive" });
  }

  return sendSuccess(res, { token: generateToken(user._id, user.tokenVersion), ...auth });
};

module.exports = { loginUser };
