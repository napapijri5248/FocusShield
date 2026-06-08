const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Split the header to grab only the token string
      token = req.headers.authorization.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authorized: Token missing",
        });
      }

      // Verify the token signature using the secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user details to the request object
      req.user = {
        id: decoded.id,
        email: decoded.email,
      };

      next();
    } catch (error) {
      console.error("[Auth Middleware] JWT Validation Error:", error.message);
      return res.status(401).json({
        success: false,
        message: "Not authorized: Token expired or invalid",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Not authorized: No bearer token provided",
    });
  }
};

module.exports = {
  protect,
};
