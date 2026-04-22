const Vocabulary = require("../models/vocabulary.model");

const normalize = (value = "") => value.toString().trim();
const normalizePos = (value = "") => {
  const cleaned = normalize(value).toLowerCase();
  if (["noun", "verb", "adjective", "other"].includes(cleaned)) return cleaned;
  return "other";
};

exports.listVocabulary = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const query = isAdmin ? {} : { status: "published" };
    const { level, topic, status, partOfSpeech } = req.query || {};

    if (level) {
      query.level = new RegExp(normalize(level), "i");
    }
    if (topic) {
      query.topic = new RegExp(normalize(topic), "i");
    }
    if (partOfSpeech) {
      query.partOfSpeech = normalizePos(partOfSpeech);
    }
    if (isAdmin && status) {
      query.status = normalize(status).toLowerCase() === "draft" ? "draft" : "published";
    }

    const items = await Vocabulary.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createVocabulary = async (req, res) => {
  try {
    const { word, meaning, phonetic, example, level, topic, status, partOfSpeech } =
      req.body || {};
    const cleanWord = normalize(word);
    const cleanMeaning = normalize(meaning);
    if (!cleanWord || !cleanMeaning) {
      return res.status(400).json({ message: "Word and meaning are required" });
    }

    const item = await Vocabulary.create({
      word: cleanWord,
      meaning: cleanMeaning,
      phonetic: normalize(phonetic),
      example: normalize(example),
      partOfSpeech: normalizePos(partOfSpeech),
      level: normalize(level),
      topic: normalize(topic),
      status: normalize(status).toLowerCase() === "draft" ? "draft" : "published",
      createdBy: req.user?._id || null
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateVocabulary = async (req, res) => {
  try {
    const item = await Vocabulary.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Vocabulary not found" });

    const { word, meaning, phonetic, example, level, topic, status, partOfSpeech } =
      req.body || {};
    if (word !== undefined) item.word = normalize(word);
    if (meaning !== undefined) item.meaning = normalize(meaning);
    if (phonetic !== undefined) item.phonetic = normalize(phonetic);
    if (example !== undefined) item.example = normalize(example);
    if (partOfSpeech !== undefined) item.partOfSpeech = normalizePos(partOfSpeech);
    if (level !== undefined) item.level = normalize(level);
    if (topic !== undefined) item.topic = normalize(topic);
    if (status !== undefined) {
      item.status = normalize(status).toLowerCase() === "draft" ? "draft" : "published";
    }

    if (!item.word || !item.meaning) {
      return res.status(400).json({ message: "Word and meaning are required" });
    }

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteVocabulary = async (req, res) => {
  try {
    const item = await Vocabulary.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Vocabulary not found" });
    await item.deleteOne();
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
