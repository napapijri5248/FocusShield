const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // Targeted duration in seconds (e.g. 1500 for 25 mins)
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    distractionCount: {
      type: Number,
      default: 0, // Incremented when user triggers 'continue anyway' on soft blocks
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Session", sessionSchema);
