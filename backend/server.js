require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { connectDB } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const socketService = require("./services/socketService");

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for the API and extension
    methods: ["GET", "POST"]
  }
});

// Initialize Socket Service
socketService.init(io);

// Security Middlewares (disable CSP for API compatibility)
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());

// Logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Body Parser
app.use(express.json());

// Root Endpoint
app.get("/", (req, res) => {
  res.json({ message: "FocusShield API Running" });
});

// Mount Auth Routes
app.use("/api/auth", authRoutes);

// Mount Session Routes
app.use("/api/sessions", sessionRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global Error Intercepted:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start Server
server.listen(PORT, async () => {
  console.log(`[Server] FocusShield running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  await connectDB();
});

module.exports = server; // Export server for testing/use
