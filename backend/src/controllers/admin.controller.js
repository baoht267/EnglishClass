const User = require("../models/user.model");
const Exam = require("../models/exam.model");
const Question = require("../models/question.model");
const Result = require("../models/result.model");

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

exports.getSummary = async (req, res) => {
  try {
    const now = new Date();
    const periodDays = 7;
    const periodAgo = new Date(now);
    periodAgo.setDate(now.getDate() - periodDays);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const [
      totalQuestions,
      totalTests,
      activeUsers,
      submissionsToday,
      submissionsYesterday,
      questionsLast30,
      questionsPrev30,
      testsLast30,
      testsPrev30,
      usersLast30,
      usersPrev30
    ] = await Promise.all([
      Question.countDocuments(),
      Exam.countDocuments(),
      User.countDocuments({ isActive: true }),
      Result.countDocuments({ submittedAt: { $gte: today } }),
      Result.countDocuments({ submittedAt: { $gte: yesterday, $lt: today } }),
      Question.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Question.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Exam.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Exam.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
    ]);

    const recentResults = await Result.find({ submittedAt: { $gte: periodAgo } });
    const avgScore =
      recentResults.length > 0
        ? Math.round(
            recentResults.reduce((sum, r) => {
              const pct = r.total ? (r.score / r.total) * 100 : 0;
              return sum + pct;
            }, 0) / recentResults.length
          )
        : 0;

    const dayKey = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.toISOString().slice(0, 10);
    };
    const dailyMap = new Map();
    for (const r of recentResults) {
      const key = dayKey(r.submittedAt);
      const pct = r.total ? (r.score / r.total) * 100 : 0;
      const cur = dailyMap.get(key) || { sum: 0, count: 0 };
      cur.sum += pct;
      cur.count += 1;
      dailyMap.set(key, cur);
    }
    const chart = [];
    for (let i = periodDays - 1; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = dayKey(d);
      const cur = dailyMap.get(key);
      const value = cur ? Math.round(cur.sum / cur.count) : 0;
      chart.push({ date: key, value });
    }

    const [latestUser] = await User.find()
      .sort({ createdAt: -1 })
      .limit(1)
      .select("name role createdAt");
    const [latestQuestion] = await Question.find()
      .sort({ updatedAt: -1 })
      .limit(1)
      .select("questionId content updatedAt");
    const [latestExam] = await Exam.find()
      .sort({ createdAt: -1 })
      .limit(1)
      .select("title createdAt");
    const [latestResult] = await Result.find()
      .sort({ submittedAt: -1 })
      .limit(1)
      .select("examTitle score total submittedAt");

    const activities = [
      latestUser
        ? {
            type: "user",
            title: "New User Registration",
            description: `${latestUser.name} signed up as a ${latestUser.role || "Student"}.`,
            at: latestUser.createdAt
          }
        : null,
      latestQuestion
        ? {
            type: "question",
            title: "Question Edit",
            description: `${latestQuestion.content?.slice(0, 40) || "Question"} updated`,
            at: latestQuestion.updatedAt
          }
        : null,
      latestExam
        ? {
            type: "exam",
            title: "Test Published",
            description: `"${latestExam.title}" is now live.`,
            at: latestExam.createdAt
          }
        : null,
      latestResult
        ? {
            type: "submission",
            title: "New Submission",
            description: `${latestResult.examTitle || "Exam"} scored ${latestResult.score}/${latestResult.total}.`,
            at: latestResult.submittedAt
          }
        : null
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const pctDelta = (current, prev) => {
      if (prev > 0) {
        return Math.round(((current - prev) / prev) * 100);
      }
      return current > 0 ? 100 : 0;
    };

    res.json({
      totals: {
        questions: totalQuestions,
        tests: totalTests,
        activeUsers,
        submissionsToday
      },
      deltas: {
        questionsPct: pctDelta(questionsLast30, questionsPrev30),
        testsDelta: testsLast30 - testsPrev30,
        usersPct: pctDelta(usersLast30, usersPrev30),
        submissionsPct: pctDelta(submissionsToday, submissionsYesterday)
      },
      avgScore,
      chart,
      activities
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
