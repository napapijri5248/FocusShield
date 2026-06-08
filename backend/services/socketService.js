const jwt = require("jsonwebtoken");

let ioInstance = null;

const socketService = {
  init: (io) => {
    ioInstance = io;

    // Middleware to authenticate Socket.io connections using JWT
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id; // Attach userId to the socket
        next();
      } catch (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      console.log(`[Socket] Client connected: ${socket.id} (User: ${socket.userId})`);

      // Join the user-specific room
      socket.join(`user_${socket.userId}`);

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  },

  emitToUser: (userId, event, data) => {
    if (ioInstance) {
      ioInstance.to(`user_${userId}`).emit(event, data);
      console.log(`[Socket] Emitted event '${event}' to user_${userId}`);
    } else {
      console.warn("[Socket] Socket.io not initialized; event not emitted");
    }
  }
};

module.exports = socketService;
