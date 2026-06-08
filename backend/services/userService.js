const User = require("../models/User");
const dbFallbackService = require("./dbFallbackService");
const dbConfig = require("../config/db");

const userService = {
  // Save a new user to the active database
  createUser: async (userData) => {
    const formattedEmail = userData.email.toLowerCase();
    
    if (dbConfig.isConnected()) {
      // Check uniqueness in MongoDB
      const existingUser = await User.findOne({ email: formattedEmail });
      if (existingUser) {
        const error = new Error("User with this email already exists");
        error.status = 400;
        throw error;
      }
      
      const user = new User({
        username: userData.username,
        email: formattedEmail,
        password: userData.password
      });
      return await user.save();
    } else {
      // Check uniqueness in local JSON fallback
      const existingUser = dbFallbackService.findOne("users", (u) => u.email === formattedEmail);
      if (existingUser) {
        const error = new Error("User with this email already exists");
        error.status = 400;
        throw error;
      }

      const newUser = {
        username: userData.username,
        email: formattedEmail,
        password: userData.password
      };
      return dbFallbackService.insert("users", newUser);
    }
  },

  // Retrieve user by their email
  findUserByEmail: async (email) => {
    const formattedEmail = email.toLowerCase();
    if (dbConfig.isConnected()) {
      return await User.findOne({ email: formattedEmail });
    } else {
      return dbFallbackService.findOne("users", (u) => u.email === formattedEmail);
    }
  },

  // Retrieve user by ID (used for protected profile checks)
  findUserById: async (id) => {
    if (dbConfig.isConnected()) {
      return await User.findById(id).select("-password"); // omit password in Mongoose
    } else {
      const user = dbFallbackService.findOne("users", (u) => u._id === id);
      if (user) {
        // Return shallow copy without password for safety
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
      return null;
    }
  }
};

module.exports = userService;
