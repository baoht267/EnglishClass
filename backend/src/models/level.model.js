const mongoose = require("mongoose");

const LevelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Level", LevelSchema);
