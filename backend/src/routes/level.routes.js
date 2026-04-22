const express = require("express");
const router = express.Router();

const levelController = require("../controllers/level.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.get("/", authMiddleware, levelController.listLevels);
router.get("/:id", authMiddleware, levelController.getLevel);

module.exports = router;
