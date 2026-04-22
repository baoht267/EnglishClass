const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const resultController = require("../controllers/result.controller");

router.get("/me", authMiddleware, resultController.getMyResults);
router.get("/", authMiddleware, requireRole("ADMIN"), resultController.getAllResults);
router.get("/:id", authMiddleware, resultController.getResultDetail);

module.exports = router;
