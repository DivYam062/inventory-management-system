const authorize = (requiredRoles) => {
  // Convert single role to array for consistency
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return (req, res, next) => {
    try {
      // Check if user exists (should be set by authMiddleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "You are not authorized to perform this action.",
        });
      }

      // Check if user has any of the required roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${roles.join(" or ")} privileges required.`,
        });
      }

      // User has the required role, proceed to the next middleware/controller
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Authorization error",
        error: error.message,
      });
    }
  };
};

module.exports = authorize;