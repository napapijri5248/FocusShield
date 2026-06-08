const express = require("express");
const sessionController = require("../controllers/sessionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Apply auth middleware to protect all session routes
router.use(protect);

// Session endpoints
router.post("/start", sessionController.start);
router.post("/end", sessionController.end);
router.post("/distract", sessionController.registerDistraction);
router.get("/history", sessionController.history);

module.exports = router;
