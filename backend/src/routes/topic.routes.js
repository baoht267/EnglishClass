const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const topicController = require("../controllers/topic.controller");

router.get("/", authMiddleware, topicController.listTopics);
router.post("/", authMiddleware, requireRole("ADMIN"), topicController.createTopic);
router.put("/:id", authMiddleware, requireRole("ADMIN"), topicController.updateTopic);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), topicController.deleteTopic);

module.exports = router;
