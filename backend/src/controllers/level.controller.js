const Level = require("../models/level.model");

exports.listLevels = async (req, res) => {
  try {
    const levels = await Level.find().sort({ order: 1, createdAt: -1 });
    res.json(levels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getLevel = async (req, res) => {
  try {
    const level = await Level.findById(req.params.id);
    if (!level) return res.status(404).json({ message: "Level not found" });
    res.json(level);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
