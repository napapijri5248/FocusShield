const { z } = require("zod");

// Signup input validation schema
const signupSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username must not exceed 30 characters" })
    .trim(),
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email address format" })
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(50, { message: "Password must not exceed 50 characters" }),
});

// Login input validation schema
const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email({ message: "Invalid email address format" })
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, { message: "Password cannot be empty" }),
});

// Middleware factory to validate body contents using Zod
const validate = (schema) => (req, res, next) => {
  try {
    // Parse and update req.body with clean, parsed contents
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: formattedErrors,
      });
    }
    next(error);
  }
};

module.exports = {
  validate,
  signupSchema,
  loginSchema,
};
