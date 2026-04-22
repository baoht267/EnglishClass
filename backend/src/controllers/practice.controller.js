const Practice = require("../models/practice.model");
const Question = require("../models/question.model");
const Result = require("../models/result.model");
const Answer = require("../models/answer.model");
const Category = require("../models/category.model");
const Level = require("../models/level.model");
const fs = require("fs");
const path = require("path");
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

exports.listPractices = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const query = isAdmin ? {} : { status: "published" };
    const practices = await Practice.find(query)
      .populate("categoryId", "name slug")
      .populate("levelId", "name order")
      .sort({ createdAt: -1 });

    res.json(
      practices.map((e) => ({
        _id: e._id,
        examId: e.examId,
        title: e.title,
        description: e.description,
        status: e.status,
        publishedAt: e.publishedAt || null,
        timeLimit: e.timeLimit ?? null,
        passMark: e.passMark ?? null,
        category: e.categoryId
          ? { _id: e.categoryId._id, name: e.categoryId.name, slug: e.categoryId.slug }
          : null,
        level: e.levelId
          ? { _id: e.levelId._id, name: e.levelId.name, order: e.levelId.order }
          : null,
        questionCount: e.questions?.length || 0,
        audioUrl: e.audioUrl || "",
        audioName: e.audioName || "",
        createdAt: e.createdAt
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPractice = async (req, res) => {
  try {
    const practiceId = req.params.id;
    const isAdmin = req.user?.role === "ADMIN";

    const practice = await Practice.findById(practiceId)
      .populate({
        path: "questions",
        select: isAdmin ? "" : "questionId content options createdAt audioUrl audioName explanation"
      })
      .populate("categoryId", "name slug")
      .populate("levelId", "name order");

    if (!practice) return res.status(404).json({ message: "Practice not found" });
    if (!isAdmin && practice.status !== "published") {
      return res.status(403).json({ message: "Practice is not published" });
    }
    res.json(practice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createPractice = async (req, res) => {
  try {
    const {
      title,
      description,
      questions,
      categoryId,
      levelId,
      status,
      timeLimit,
      passMark,
      audioUrl,
      audioName,
      audioDataUrl
    } = req.body;
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const validCount = await Question.countDocuments({ _id: { $in: questions } });
    if (validCount !== questions.length) {
      return res.status(400).json({ message: "Some questions do not exist" });
    }

    if (categoryId) {
      const exists = await Category.findById(categoryId);
      if (!exists) return res.status(400).json({ message: "Invalid categoryId" });
    }

    if (levelId) {
      const exists = await Level.findById(levelId);
      if (!exists) return res.status(400).json({ message: "Invalid levelId" });
    }

    const examId = await getNextSeq("practices");
    const normalizedStatus =
      (status || "").toString().toLowerCase() === "published" ? "published" : "draft";
    const parsedTimeLimit =
      timeLimit === undefined || timeLimit === null || timeLimit === ""
        ? null
        : Number(timeLimit);
    if (parsedTimeLimit !== null && !Number.isFinite(parsedTimeLimit)) {
      return res.status(400).json({ message: "Invalid timeLimit" });
    }
    const parsedPassMark =
      passMark === undefined || passMark === null || passMark === ""
        ? null
        : Number(passMark);
    if (parsedPassMark !== null && !Number.isFinite(parsedPassMark)) {
      return res.status(400).json({ message: "Invalid passMark" });
    }
    let audioInfo = { audioUrl: audioUrl || "", audioName: audioName || "" };
    if (audioDataUrl) {
      audioInfo = await saveAudioDataUrl(audioDataUrl, audioName);
    }

    const practice = await Practice.create({
      examId,
      title,
      description,
      questions,
      categoryId: categoryId || null,
      levelId: levelId || null,
      status: normalizedStatus,
      publishedAt: normalizedStatus === "published" ? new Date() : null,
      timeLimit: parsedTimeLimit,
      passMark: parsedPassMark,
      audioUrl: audioInfo.audioUrl,
      audioName: audioInfo.audioName
    });

    res.status(201).json(practice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePractice = async (req, res) => {
  try {
    const {
      title,
      description,
      questions,
      categoryId,
      levelId,
      status,
      timeLimit,
      passMark,
      audioUrl,
      audioName,
      audioDataUrl
    } = req.body;

    const practice = await Practice.findById(req.params.id);
    if (!practice) return res.status(404).json({ message: "Practice not found" });

    if (title !== undefined) practice.title = title;
    if (description !== undefined) practice.description = description;
    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Invalid questions" });
      }
      const validCount = await Question.countDocuments({ _id: { $in: questions } });
      if (validCount !== questions.length) {
        return res.status(400).json({ message: "Some questions do not exist" });
      }
      practice.questions = questions;
    }

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        practice.categoryId = null;
      } else {
        const exists = await Category.findById(categoryId);
        if (!exists) return res.status(400).json({ message: "Invalid categoryId" });
        practice.categoryId = categoryId;
      }
    }

    if (levelId !== undefined) {
      if (levelId === null || levelId === "") {
        practice.levelId = null;
      } else {
        const exists = await Level.findById(levelId);
        if (!exists) return res.status(400).json({ message: "Invalid levelId" });
        practice.levelId = levelId;
      }
    }

    if (timeLimit !== undefined) {
      if (timeLimit === null || timeLimit === "") {
        practice.timeLimit = null;
      } else {
        const parsed = Number(timeLimit);
        if (!Number.isFinite(parsed)) {
          return res.status(400).json({ message: "Invalid timeLimit" });
        }
        practice.timeLimit = parsed;
      }
    }

    if (passMark !== undefined) {
      if (passMark === null || passMark === "") {
        practice.passMark = null;
      } else {
        const parsed = Number(passMark);
        if (!Number.isFinite(parsed)) {
          return res.status(400).json({ message: "Invalid passMark" });
        }
        practice.passMark = parsed;
      }
    }

    if (audioDataUrl) {
      const audioInfo = await saveAudioDataUrl(audioDataUrl, audioName);
      practice.audioUrl = audioInfo.audioUrl;
      practice.audioName = audioInfo.audioName;
    } else if (audioUrl !== undefined) {
      practice.audioUrl = audioUrl || "";
      practice.audioName = audioName || "";
    }

    if (status !== undefined) {
      const nextStatus =
        (status || "").toString().toLowerCase() === "published" ? "published" : "draft";
      practice.status = nextStatus;
      if (nextStatus === "published" && !practice.publishedAt) {
        practice.publishedAt = new Date();
      }
      if (nextStatus === "draft") {
        practice.publishedAt = null;
      }
    }

    await practice.save();
    res.json(practice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deletePractice = async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);
    if (!practice) return res.status(404).json({ message: "Practice not found" });

    await practice.deleteOne();
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitPractice = async (req, res) => {
  try {
    const user = req.user;
    const practiceId = req.params.id;
    const { answers, timeSpent } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers must be an array" });
    }

    const practice = await Practice.findById(practiceId);
    if (!practice) {
      return res.status(404).json({ message: "Practice not found" });
    }

    const questions = await Question.find({
      _id: { $in: practice.questions }
    });

    let score = 0;
    const total = questions.length;

    const resultId = await getNextSeq("results");
    let categoryName = null;
    if (practice.categoryId) {
      const cat = await Category.findById(practice.categoryId).select("name");
      if (cat) categoryName = cat.name;
    }

    let parsedTimeSpent = null;
    if (timeSpent !== undefined && timeSpent !== null && timeSpent !== "") {
      const parsed = Number(timeSpent);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Invalid timeSpent" });
      }
      parsedTimeSpent = Math.floor(parsed);
    }

    const result = await Result.create({
      resultId,
      userId: user._id,
      examModel: "Practice",
      examId: practice._id,
      examCode: practice.examId,
      examTitle: practice.title,
      examCategoryId: practice.categoryId || null,
      examCategoryName: categoryName,
      examTimeLimit: practice.timeLimit ?? null,
      examPassMark: practice.passMark ?? null,
      score: 0,
      total,
      timeSpent: parsedTimeSpent,
      submittedAt: new Date()
    });

    for (const question of questions) {
      const userAnswer = answers.find(
        (a) => a.questionId === question._id.toString()
      );

      const selectedKey = userAnswer ? userAnswer.selectedKey : null;
      const isCorrect = selectedKey === question.correctKey;

      if (isCorrect) score++;

      const answerId = await getNextSeq("answers");

      await Answer.create({
        answerId,
        resultId: result._id,
        questionId: question._id,
        selectedKey,
        isCorrect
      });
    }

    result.score = score;
    await result.save();

    res.json({
      message: "Submit success",
      score,
      total,
      resultObjectId: result._id,
      resultId: result.resultId
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
