const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ENTITY_STATUS } = require("../config/constants");
const { buildAuthContext } = require("../services/authContextService");

const unauthorized = (res, message = "You are not authorized to perform this action.") =>
  res.status(401).json({ success: false, message });

// Authenticates the bearer token and attaches the authorization context to the request:
//   req.user            the User document
//   req.auth            { user, organization, isSuperAdmin, permissions }
//   req.isSuperAdmin    true only for the system-level Super Admin
//   req.organizationId  the caller's organization (null for Super Admin) - never taken from client input
//   req.permissions     { resource: [actions] }
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(res);
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    return unauthorized(res, "Invalid or expired token");
  }

  const user = await User.findById(decoded.userId);

  if (!user || user.status !== ENTITY_STATUS.ACTIVE) {
    return unauthorized(res, "User not found or inactive");
  }

  const auth = await buildAuthContext(user);

  if (!auth || (auth.organization && auth.organization.status !== ENTITY_STATUS.ACTIVE)) {
    return unauthorized(res, "Your organization or role is no longer available");
  }

  req.user = user;
  req.auth = auth;
  req.isSuperAdmin = auth.isSuperAdmin;
  req.organizationId = auth.organization ? auth.organization.id : null;
  req.permissions = auth.permissions;

  next();
};

module.exports = authenticate;
