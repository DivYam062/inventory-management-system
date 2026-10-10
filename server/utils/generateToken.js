const jwt = require("jsonwebtoken");

// tokenVersion ties the token to the user's current password (see User.tokenVersion).
const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    {
      userId,
      tv: tokenVersion,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

module.exports = generateToken;