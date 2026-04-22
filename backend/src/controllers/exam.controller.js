const Exam = require("../models/exam.model");
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

exports.listExams = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "ADMIN";
    const query = isAdmin ? {} : { status: "published" };
    const exams = await Exam.find(query)
      .populate("categoryId", "name slug")
      .populate("levelId", "name order")
      .sort({ createdAt: -1 });

    res.json(
      exams.map((e) => ({
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

exports.getExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const isAdmin = req.user?.role === "ADMIN";

    const exam = await Exam.findById(examId)
      .populate({
        path: "questions",
        select: isAdmin ? "" : "questionId content options createdAt audioUrl audioName explanation"
      })
      .populate("categoryId", "name slug")
      .populate("levelId", "name order");

    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!isAdmin && exam.status !== "published") {
      return res.status(403).json({ message: "Exam is not published" });
    }
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createExam = async (req, res) => {
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

    const examId = await getNextSeq("exams");
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
    const exam = await Exam.create({
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

    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateExam = async (req, res) => {
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

    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (title !== undefined) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Invalid questions" });
      }
      const validCount = await Question.countDocuments({ _id: { $in: questions } });
      if (validCount !== questions.length) {
        return res.status(400).json({ message: "Some questions do not exist" });
      }
      exam.questions = questions;
    }

    if (categoryId !== undefined) {
      if (categoryId === null || categoryId === "") {
        exam.categoryId = null;
      } else {
        const exists = await Category.findById(categoryId);
        if (!exists) return res.status(400).json({ message: "Invalid categoryId" });
        exam.categoryId = categoryId;
      }
    }

    if (levelId !== undefined) {
      if (levelId === null || levelId === "") {
        exam.levelId = null;
      } else {
        const exists = await Level.findById(levelId);
        if (!exists) return res.status(400).json({ message: "Invalid levelId" });
        exam.levelId = levelId;
      }
    }

    if (timeLimit !== undefined) {
      if (timeLimit === null || timeLimit === "") {
        exam.timeLimit = null;
      } else {
        const parsed = Number(timeLimit);
        if (!Number.isFinite(parsed)) {
          return res.status(400).json({ message: "Invalid timeLimit" });
        }
        exam.timeLimit = parsed;
      }
    }

    if (passMark !== undefined) {
      if (passMark === null || passMark === "") {
        exam.passMark = null;
      } else {
        const parsed = Number(passMark);
        if (!Number.isFinite(parsed)) {
          return res.status(400).json({ message: "Invalid passMark" });
        }
        exam.passMark = parsed;
      }
    }

    if (audioDataUrl) {
      const audioInfo = await saveAudioDataUrl(audioDataUrl, audioName);
      exam.audioUrl = audioInfo.audioUrl;
      exam.audioName = audioInfo.audioName;
    } else if (audioUrl !== undefined) {
      exam.audioUrl = audioUrl || "";
      exam.audioName = audioName || "";
    }

    if (status !== undefined) {
      const nextStatus =
        (status || "").toString().toLowerCase() === "published" ? "published" : "draft";
      exam.status = nextStatus;
      if (nextStatus === "published" && !exam.publishedAt) {
        exam.publishedAt = new Date();
      }
      if (nextStatus === "draft") {
        exam.publishedAt = null;
      }
    }

    await exam.save();
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    await exam.deleteOne();
    res.json({ message: "Delete success" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitExam = async (req, res) => {
  try {
    const user = req.user;          // từ auth.middleware
    const examId = req.params.id;
    const { answers, timeSpent } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers must be an array" });
    }

    // 1. kiểm tra đề
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // 2. lấy câu hỏi
    const questions = await Question.find({
      _id: { $in: exam.questions }
    });

    let score = 0;
    const total = questions.length;

    // 3. tạo result
    const resultId = await getNextSeq("results");
    let categoryName = null;
    if (exam.categoryId) {
      const cat = await Category.findById(exam.categoryId).select("name");
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
      examModel: "Exam",
      examId: exam._id,
      examCode: exam.examId,
      examTitle: exam.title,
      examCategoryId: exam.categoryId || null,
      examCategoryName: categoryName,
      examTimeLimit: exam.timeLimit ?? null,
      examPassMark: exam.passMark ?? null,
      score: 0,
      total,
      timeSpent: parsedTimeSpent,
      submittedAt: new Date()
    });

    // 4. chấm từng câu
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

    // 5. cập nhật điểm
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
