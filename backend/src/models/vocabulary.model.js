const mongoose = require("mongoose");

const VocabularySchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    trim: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  phonetic: {
    type: String,
    default: "",
    trim: true
  },
  example: {
    type: String,
    default: "",
    trim: true
  },
  partOfSpeech: {
    type: String,
    enum: ["noun", "verb", "adjective", "other"],
    default: "other"
  },
  level: {
    type: String,
    default: "",
    trim: true
  },
  topic: {
    type: String,
    default: "",
    trim: true
  },
  status: {
    type: String,
    enum: ["draft", "published"],
    default: "published"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Vocabulary", VocabularySchema);
