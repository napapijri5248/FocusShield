const Session = require("../models/Session");
const dbFallbackService = require("./dbFallbackService");
const dbConfig = require("../config/db");

const sessionService = {
  // Start a new session log
  startSession: async (sessionData) => {
    const { userId, duration } = sessionData;

    if (dbConfig.isConnected()) {
      const session = new Session({
        userId,
        duration,
        startTime: new Date(),
        completed: false,
        distractionCount: 0
      });
      return await session.save();
    } else {
      const newSession = {
        userId,
        duration: Number(duration),
        startTime: new Date().toISOString(),
        completed: false,
        distractionCount: 0
      };
      return dbFallbackService.insert("sessions", newSession);
    }
  },

  // End an active focus session
  endSession: async (sessionId, userId, updates) => {
    const { completed, distractionCount } = updates;
    const endTime = new Date();

    if (dbConfig.isConnected()) {
      return await Session.findOneAndUpdate(
        { _id: sessionId, userId },
        { 
          $set: { 
            completed: completed ?? true, 
            endTime,
            ...(distractionCount !== undefined && { distractionCount })
          } 
        },
        { new: true }
      );
    } else {
      return dbFallbackService.updateOne(
        "sessions",
        (s) => s._id === sessionId && s.userId === userId,
        {
          completed: completed ?? true,
          endTime: endTime.toISOString(),
          ...(distractionCount !== undefined && { distractionCount: Number(distractionCount) })
        }
      );
    }
  },

  // Increment the distraction counter of a session (triggered by Chrome Extension Soft Block bypasses)
  incrementDistraction: async (sessionId, userId) => {
    if (dbConfig.isConnected()) {
      return await Session.findOneAndUpdate(
        { _id: sessionId, userId },
        { $inc: { distractionCount: 1 } },
        { new: true }
      );
    } else {
      const session = dbFallbackService.findOne("sessions", (s) => s._id === sessionId && s.userId === userId);
      if (!session) return null;
      return dbFallbackService.updateOne(
        "sessions",
        (s) => s._id === sessionId && s.userId === userId,
        { distractionCount: (session.distractionCount || 0) + 1 }
      );
    }
  },

  // Fetch session history for a specific user
  getUserSessions: async (userId) => {
    if (dbConfig.isConnected()) {
      return await Session.find({ userId }).sort({ startTime: -1 });
    } else {
      // Find and sort by startTime descending
      return dbFallbackService
        .find("sessions", (s) => s.userId === userId)
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }
  }
};

module.exports = sessionService;
