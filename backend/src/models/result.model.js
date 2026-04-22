const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
  resultId: {
    type: Number,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  examModel: {
    type: String,
    enum: ["Exam", "Practice"],
    default: "Exam"
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "examModel",
    required: true
  },
  examCode: {
    type: Number
  },
  examTitle: {
    type: String
  },
  examCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  examCategoryName: {
    type: String
  },
  examTimeLimit: {
    type: Number
  },
  examPassMark: {
    type: Number
  },
  score: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  timeSpent: {
    type: Number
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Result", ResultSchema);
