const express = require("express");
const router = express.Router();

const messageController = require("../controllers/message.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.post("/", authMiddleware, messageController.sendMessage);
router.get("/me", authMiddleware, messageController.listMyMessages);
router.get("/user/:id", authMiddleware, requireRole("ADMIN"), messageController.listUserMessages);
router.put("/read/:id", authMiddleware, requireRole("ADMIN"), messageController.markConversationRead);

module.exports = router;
