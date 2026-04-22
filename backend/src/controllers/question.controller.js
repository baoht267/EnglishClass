const fs = require("fs");
const path = require("path");
const Question = require("../models/question.model");
const Exam = require("../models/exam.model");
const Category = require("../models/category.model");
const Level = require("../models/level.model");
const Counter = require("../models/counter.model");
const { getNextSeq } = require("../utils/sequence");

const saveAudioDataUrl = async (audioDataUrl, audioName) => {
  if (!audioDataUrl) return { audioUrl: "", audioName: "" };
  const match = audioDataUrl.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid audio data");
  const mime = match[1];
  let ext = mime.split("/")[1] || "mp3";
  if (ext === "mpeg") ext = "mp3";
  if (ext === "x-wav") ext = "wav";
  if (ext === "x-m4a") ext = "m4a";
  if (ext === "mp4") ext = "m4a";
  const safeBase = (audioName || "audio")
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 32);
  const fileName = `${safeBase}-${Date.now()}.${ext}`;
  const dir = path.join(__dirname, "..", "..", "uploads", "audio");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), Buffer.from(match[2], "base64"));
  return {
    audioUrl: `/uploads/audio/${fileName}`,
    audioName: audioName || fileName
  };
};

const syncQuestionCounter = async () => {
  const latest = await Question.findOne().sort({ questionId: -1 }).select("questionId");
  const maxId = latest?.questionId || 0;
  await Counter.findOneAndUpdate(
    { _id: "questions" },
    { $set: { seq: maxId } },
    { upsert: true, new: true }
  );
};

exports.listQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .populate("categoryId", "name slug")
      .populate("levelId", "name order")
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.countQuestions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.levelId) filter.levelId = req.query.levelId;
    const count = await Question.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const {
      content,
      options,
      correctKey,
      categoryId,
      levelId,
      explanation,
      audioUrl,
      audioName,
      audioDataUrl
    } = req.body;
    if (!content || !options || !correctKey) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (categoryId) {
      const exists = await Category.findById(categoryId);
      if (!exists) return res.status(400).json({ message: "Invalid categoryId" });
    }

    if (levelId) {
      const exists = await Level.findById(levelId);
      if (!exists) return res.status(400).json({ message: "Invalid levelId" });
    }

    const questionId = await getNextSeq("questions");
    let audioInfo = { audioUrl: audioUrl || "", audioName: audioName || "" };
    if (audioDataUrl) {
      audioInfo = await saveAudioDataUrl(audioDataUrl, audioName);
    }

    const buildPayload = (nextId) => ({
      questionId: nextId,
      content,
      options,
      correctKey,
      explanation: explanation || "",
      categoryId: categoryId || null,
      levelId: levelId || null,
      audioUrl: audioInfo.audioUrl,
      audioName: audioInfo.audioName
    });

    let question;
    try {
      question = await Question.create(buildPayload(questionId));
    } catch (err) {
      if (err?.code === 11000 && (err?.keyPattern?.questionId || err?.keyValue?.questionId)) {
        await syncQuestionCounter();
        const retryId = await getNextSeq("questions");
        question = await Question.create(buildPayload(retryId));
      } else {
        throw err;
      }
    }

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const {
      content,
      options,
      correctKey,
      categoryId,
      levelId,
      explanation,
      audioUrl,
      audioName,
      audioDataUrl
    } = req.body;

    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    if (content !== undefined) question.content = content;
    if (options !== undefined) question.options = options;
    if (correctKey !== undefined) question.correctKey = correctKey;
    if (explanation !== undefined) question.explanation = explanation;

    if (audioDataUrl) {
      const audioInfo = await saveAudioDataUrl(audioDataUrl, audioName);
      question.audioUrl = audioInfo.audioUrl;
      question.audioName = audioInfo.audioName;
    } else if (audioUrl !== undefined) {
      question.audioUrl = audioUrl || "";
      question.audioName = audioName || "";
    }

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        question.categoryId = null;
      } else {
        const exists = await Category.findById(categoryId);
        if (!exists) return res.status(400).json({ message: "Invalid categoryId" });
        question.categoryId = categoryId;
      }
    }

    if (levelId !== undefined) {
      if (levelId === null || levelId === "") {
        question.levelId = null;
      } else {
        const exists = await Level.findById(levelId);
        if (!exists) return res.status(400).json({ message: "Invalid levelId" });
        question.levelId = levelId;
      }
    }

    await question.save();
    res.json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Question not found" });

    await Exam.updateMany(
      { questions: question._id },
      { $pull: { questions: question._id } }
    );

    await question.deleteOne();
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
