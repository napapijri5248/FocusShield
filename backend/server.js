require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors());

// Logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body Parser
app.use(express.json());

// Root Endpoint (Step 1)
app.get("/", (req, res) => {
  res.json({ message: "FocusShield API Running" });
});

// Mount Auth Routes (Step 4 & 5)
app.use("/api/auth", authRoutes);

// Mount Session Routes (Step 6)
app.use("/api/sessions", sessionRoutes);

// Centralized Error Handling Middleware (Step 8C)
app.use((err, req, res, next) => {
  console.error("Global Error Intercepted:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`[Server] FocusShield running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  await connectDB();
});

module.exports = app; // For testing
