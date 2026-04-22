const express = require("express");
const router = express.Router();

const aiController = require("../controllers/ai.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/tutor", authMiddleware, aiController.tutorChat);

module.exports = router;
