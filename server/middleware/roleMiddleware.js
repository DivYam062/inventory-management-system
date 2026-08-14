const authorize = (requiredRole) => {
  return (req, res, next) => {
    try {
      // Check if user exists (should be set by authMiddleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "You are not authorized to perform this action.",
        });
      }

      // Check if user has the required role
      if (req.user.role !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole} privileges required.`,
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