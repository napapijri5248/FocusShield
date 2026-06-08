const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate, signupSchema, loginSchema } = require("../middleware/validation");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Resume-worthy rate limiting for login/signup (Step 8A)
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth attempts per window
  message: {
    success: false,
    message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints
router.post("/signup", authRateLimiter, validate(signupSchema), authController.signup);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.get("/profile", protect, authController.getProfile);

module.exports = router;
