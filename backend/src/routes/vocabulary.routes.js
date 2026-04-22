const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const vocabularyController = require("../controllers/vocabulary.controller");
const vocabProgressController = require("../controllers/vocabProgress.controller");

router.get("/", authMiddleware, vocabularyController.listVocabulary);
router.get("/progress", authMiddleware, vocabProgressController.getProgress);
router.post("/progress", authMiddleware, vocabProgressController.trackProgress);
router.post("/", authMiddleware, requireRole("ADMIN"), vocabularyController.createVocabulary);
router.put("/:id", authMiddleware, requireRole("ADMIN"), vocabularyController.updateVocabulary);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), vocabularyController.deleteVocabulary);

module.exports = router;
