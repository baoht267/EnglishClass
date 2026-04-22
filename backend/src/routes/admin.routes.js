const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const adminController = require("../controllers/admin.controller");

router.get("/summary", authMiddleware, requireRole("ADMIN"), adminController.getSummary);

module.exports = router;
