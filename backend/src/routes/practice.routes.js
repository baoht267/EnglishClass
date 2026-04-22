const express = require("express");
const router = express.Router();

const practiceController = require("../controllers/practice.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.get("/", authMiddleware, practiceController.listPractices);
router.get("/:id", authMiddleware, practiceController.getPractice);
router.post("/", authMiddleware, requireRole("ADMIN"), practiceController.createPractice);
router.put("/:id", authMiddleware, requireRole("ADMIN"), practiceController.updatePractice);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), practiceController.deletePractice);

router.post(
  "/:id/submit",
  authMiddleware,
  practiceController.submitPractice
);

module.exports = router;
