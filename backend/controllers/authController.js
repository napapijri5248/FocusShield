const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userService = require("../services/userService");

// Helper: Sign JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Secure long-lived session for extension + dashboard
  );
};

const authController = {
  // @desc    Register a new user
  // @route   POST /api/auth/signup
  // @access  Public
  signup: async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      // 1. Check if user already exists
      const userExists = await userService.findUserByEmail(email);
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: "A user with this email is already registered",
        });
      }

      // 2. Hash the user's password securely (10 salt rounds)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 3. Save to active database layer (MongoDB or local JSON)
      const newUser = await userService.createUser({
        username,
        email,
        password: hashedPassword,
      });

      // 4. Generate access token
      const token = generateToken(newUser);

      // 5. Send response
      return res.status(201).json({
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // @desc    Authenticate user & get token
  // @route   POST /api/auth/login
  // @access  Public
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // 1. Locate user in database
      const user = await userService.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // 2. Compare entered password with stored hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // 3. Issue JWT token
      const token = generateToken(user);

      // 4. Return response
      return res.status(200).json({
        success: true,
        message: "Logged in successfully",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // @desc    Get current user profile
  // @route   GET /api/auth/profile
  // @access  Private
  getProfile: async (req, res, next) => {
    try {
      // req.user has been populated by the protect middleware
      const user = await userService.findUserById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
