const VocabProgress = require("../models/vocabProgress.model");

const normalize = (value = "") => value.toString().trim();
const normalizeKey = (value = "") => {
  const cleaned = normalize(value).toLowerCase();
  return cleaned || "all";
};
const todayKey = () => new Date().toISOString().slice(0, 10);

const emptyProgress = () => ({
  reviewed: 0,
  correct: 0,
  ratings: {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0
  }
});

const summarize = (items = []) =>
  items.reduce((acc, item) => {
    acc.reviewed += Number(item.reviewed || 0);
    acc.correct += Number(item.correct || 0);
    acc.ratings.again += Number(item.ratings?.again || 0);
    acc.ratings.hard += Number(item.ratings?.hard || 0);
    acc.ratings.good += Number(item.ratings?.good || 0);
    acc.ratings.easy += Number(item.ratings?.easy || 0);
    return acc;
  }, emptyProgress());

exports.getProgress = async (req, res) => {
  try {
    const topic = normalizeKey(req.query?.topic);
    const level = normalizeKey(req.query?.level);
    const date = todayKey();
    const query = { userId: req.user._id, date };
    if (topic !== "all") query.topic = topic;
    if (level !== "all") query.level = level;

    const items = await VocabProgress.find(query);
    if (!items.length) return res.json(emptyProgress());

    return res.json(summarize(items));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.trackProgress = async (req, res) => {
  try {
    const topic = normalizeKey(req.body?.topic);
    const level = normalizeKey(req.body?.level);
    const action = normalize(req.body?.action).toLowerCase();
    const rating = normalize(req.body?.rating).toLowerCase();
    const date = todayKey();

    if (!["next", "rate"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    if (action === "rate" && !["again", "hard", "good", "easy"].includes(rating)) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    const inc = { reviewed: 1 };
    if (action === "rate") {
      inc[`ratings.${rating}`] = 1;
      if (rating === "good" || rating === "easy") {
        inc.correct = 1;
      }
    }

    const doc = await VocabProgress.findOneAndUpdate(
      { userId: req.user._id, date, topic, level },
      {
        $inc: inc,
        $setOnInsert: {
          userId: req.user._id,
          date,
          topic,
          level
        }
      },
      { upsert: true, new: true }
    );

    return res.json(summarize([doc]));
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
