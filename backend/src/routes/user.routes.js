const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.put("/me/password", authMiddleware, userController.changeMyPassword);
router.get("/me", authMiddleware, userController.getMe);
router.put("/me", authMiddleware, userController.updateMe);

router.get("/", authMiddleware, requireRole("ADMIN"), userController.listUsers);
router.post("/", authMiddleware, requireRole("ADMIN"), userController.createUser);
router.put("/:id/status", authMiddleware, requireRole("ADMIN"), userController.updateStatus);

module.exports = router;
