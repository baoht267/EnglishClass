const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema({
  answerId: {
    type: Number,
    unique: true
  },
  resultId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Result",
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true
  },
  selectedKey: {
    type: String,
    enum: ["A", "B", "C", "D", null]
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
});

module.exports = mongoose.model("Answer", AnswerSchema);
