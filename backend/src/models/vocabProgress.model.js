const mongoose = require("mongoose");

const VocabProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      required: true,
      trim: true
    },
    reviewed: {
      type: Number,
      default: 0
    },
    correct: {
      type: Number,
      default: 0
    },
    ratings: {
      again: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      good: { type: Number, default: 0 },
      easy: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

VocabProgressSchema.index(
  { userId: 1, date: 1, topic: 1, level: 1 },
  { unique: true }
);

module.exports = mongoose.model("VocabProgress", VocabProgressSchema);
