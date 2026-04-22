const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
  examId: {
    type: Number,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "draft"
  },
  publishedAt: {
    type: Date
  },
  timeLimit: {
    type: Number
  },
  passMark: {
    type: Number
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
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question"
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Exam", ExamSchema);
