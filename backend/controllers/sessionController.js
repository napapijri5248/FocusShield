const sessionService = require("../services/sessionService");

const sessionController = {
  // @desc    Start a new focus session
  // @route   POST /api/sessions/start
  // @access  Private
  start: async (req, res, next) => {
    try {
      const { duration } = req.body;

      if (!duration || isNaN(duration) || Number(duration) <= 0) {
        return res.status(400).json({
          success: false,
          message: "A valid positive duration (in seconds) is required to start a session",
        });
      }

      const session = await sessionService.startSession({
        userId: req.user.id,
        duration: Number(duration),
      });

      return res.status(201).json({
        success: true,
        message: "Focus session started successfully",
        session,
      });
    } catch (error) {
      next(error);
    }
  },

  // @desc    End an active focus session
  // @route   POST /api/sessions/end
  // @access  Private
  end: async (req, res, next) => {
    try {
      const { sessionId, completed, distractionCount } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Active sessionId is required to end a session",
        });
      }

      const updatedSession = await sessionService.endSession(sessionId, req.user.id, {
        completed: completed !== undefined ? completed : true,
        distractionCount: distractionCount !== undefined ? Number(distractionCount) : undefined,
      });

      if (!updatedSession) {
        return res.status(404).json({
          success: false,
          message: "Active focus session not found for this user",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Focus session ended successfully",
        session: updatedSession,
      });
    } catch (error) {
      next(error);
    }
  },

  // @desc    Increment distraction count during active session (soft block bypass)
  // @route   POST /api/sessions/distract
  // @access  Private
  registerDistraction: async (req, res, next) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "sessionId is required to increment distraction count",
        });
      }

      const updatedSession = await sessionService.incrementDistraction(sessionId, req.user.id);

      if (!updatedSession) {
        return res.status(404).json({
          success: false,
          message: "Active focus session not found to log distraction",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Distraction logged successfully",
        session: updatedSession,
      });
    } catch (error) {
      next(error);
    }
  },

  // @desc    Get user session history
  // @route   GET /api/sessions/history
  // @access  Private
  history: async (req, res, next) => {
    try {
      const sessions = await sessionService.getUserSessions(req.user.id);
      
      return res.status(200).json({
        success: true,
        count: sessions.length,
        sessions,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = sessionController;
