const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const questionController = require("../controllers/question.controller");

router.get("/count", authMiddleware, questionController.countQuestions);
router.get("/", authMiddleware, requireRole("ADMIN"), questionController.listQuestions);
router.get("/:id", authMiddleware, requireRole("ADMIN"), questionController.getQuestion);
router.post("/", authMiddleware, requireRole("ADMIN"), questionController.createQuestion);
router.put("/:id", authMiddleware, requireRole("ADMIN"), questionController.updateQuestion);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), questionController.deleteQuestion);

module.exports = router;
