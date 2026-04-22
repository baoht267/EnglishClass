const express = require("express");
const router = express.Router();

const examController = require("../controllers/exam.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.get("/", authMiddleware, examController.listExams);
router.get("/:id", authMiddleware, examController.getExam);
router.post("/", authMiddleware, requireRole("ADMIN"), examController.createExam);
router.put("/:id", authMiddleware, requireRole("ADMIN"), examController.updateExam);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), examController.deleteExam);

router.post(
  "/:id/submit",
  authMiddleware,
  examController.submitExam   // ❗ KHÔNG có ()
);

module.exports = router;
