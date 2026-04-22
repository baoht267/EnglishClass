const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  questionId: {
    type: Number,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  options: {
    type: Map,
    of: String,
    default: {}
  },
  correctKey: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: ""
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category"
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Level"
  },
  audioUrl: {
    type: String,
    default: ""
  },
  audioName: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Question", QuestionSchema);
