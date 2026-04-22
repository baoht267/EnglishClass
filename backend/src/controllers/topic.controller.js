const Topic = require("../models/topic.model");

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

exports.listTopics = async (req, res) => {
  try {
    const topics = await Topic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const name = (req.body?.name || "").toString().trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    const slug = slugify(name);
    const exists = await Topic.findOne({ slug });
    if (exists) return res.status(400).json({ message: "Topic already exists" });
    const topic = await Topic.create({ name, slug });
    res.status(201).json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    const name = (req.body?.name || "").toString().trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    const slug = slugify(name);
    const exists = await Topic.findOne({ slug, _id: { $ne: topic._id } });
    if (exists) return res.status(400).json({ message: "Topic already exists" });
    topic.name = name;
    topic.slug = slug;
    await topic.save();
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    await topic.deleteOne();
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
