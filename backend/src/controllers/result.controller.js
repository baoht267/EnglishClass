const Result = require("../models/result.model");
const Answer = require("../models/answer.model");

exports.getMyResults = async (req, res) => {
  try {
    await Result.updateMany(
      { examModel: { $exists: false } },
      { $set: { examModel: "Exam" } }
    );
    const results = await Result.find({ userId: req.user._id })
      .populate({
        path: "examId",
        select: "examId title timeLimit passMark categoryId",
        populate: { path: "categoryId", select: "name" }
      })
      .sort({ submittedAt: -1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllResults = async (req, res) => {
  try {
    await Result.updateMany(
      { examModel: { $exists: false } },
      { $set: { examModel: "Exam" } }
    );
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.examId) filter.examId = req.query.examId;

    const results = await Result.find(filter)
      .populate("userId", "userId name email role")
      .populate({
        path: "examId",
        select: "examId title timeLimit passMark categoryId",
        populate: { path: "categoryId", select: "name" }
      })
      .sort({ submittedAt: -1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getResultDetail = async (req, res) => {
  try {
    await Result.updateMany(
      { examModel: { $exists: false } },
      { $set: { examModel: "Exam" } }
    );
    const result = await Result.findById(req.params.id)
      .populate({
        path: "examId",
        select: "examId title description timeLimit passMark categoryId audioUrl audioName",
        populate: { path: "categoryId", select: "name" }
      })
      .populate("userId", "userId name email role");

    if (!result) return res.status(404).json({ message: "Result not found" });

    const isOwner = result.userId?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "ADMIN";
    if (!isOwner && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    const answers = await Answer.find({ resultId: result._id })
      .populate(
        "questionId",
        "questionId content options correctKey explanation audioUrl audioName"
      );

    res.json({ result, answers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
