const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/register", authController.register);
router.post("/register-admin", authController.registerAdmin);
router.post("/promote-admin", authController.promoteAdmin);
router.post("/login", authController.login);
router.post("/google", authController.loginGoogle);
router.post("/google/verify-code", authController.verifyGoogleLoginCode);
router.post("/facebook", authController.loginFacebook);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-reset-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);
router.get("/me", authMiddleware, (req, res) => res.json(req.user));

module.exports = router;
