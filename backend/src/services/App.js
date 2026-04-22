const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("../config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "..", "uploads"), {
    setHeaders: (res, filePath) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith(".mp3")) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "inline");
        return;
      }
      if (lower.endsWith(".m4a") || lower.endsWith(".x-m4a") || lower.endsWith(".mp4")) {
        res.setHeader("Content-Type", "audio/mp4");
        res.setHeader("Content-Disposition", "inline");
        return;
      }
      if (lower.endsWith(".wav")) {
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Disposition", "inline");
        return;
      }
      if (lower.endsWith(".ogg")) {
        res.setHeader("Content-Type", "audio/ogg");
        res.setHeader("Content-Disposition", "inline");
      }
    }
  })
);

// ROUTES (đúng thư mục routes)
app.use("/api/auth", require("../routes/auth.routes"));
app.use("/api/exams", require("../routes/exam.routes"));
app.use("/api/practices", require("../routes/practice.routes"));
app.use("/api/questions", require("../routes/question.routes"));
app.use("/api/results", require("../routes/result.routes"));
app.use("/api/categories", require("../routes/category.routes"));
app.use("/api/levels", require("../routes/level.routes"));
app.use("/api/users", require("../routes/user.routes"));
app.use("/api/admin", require("../routes/admin.routes"));
app.use("/api/messages", require("../routes/message.routes"));
app.use("/api/ai", require("../routes/ai.routes"));
app.use("/api/vocabulary", require("../routes/vocabulary.routes"));
app.use("/api/topics", require("../routes/topic.routes"));


app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;
