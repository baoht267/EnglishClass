const User = require("../models/user.model");
const Counter = require("../models/counter.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  sendForgotPasswordEmail,
  sendResetCodeEmail,
  sendGoogleLoginCodeEmail
} = require("../utils/mailer");

// helper: lấy userId tự tăng
const getNextUserId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "users" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

const issueToken = (user, remember) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: remember ? "30d" : "1d" }
  );

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, dob, gender, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Confirm password does not match" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await getNextUserId();

    const user = await User.create({
      userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      dob,
      gender,
      role: "USER"
    });

    res.status(201).json({
      message: "Register success",
      userId: user.userId,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// REGISTER ADMIN (dev only: requires ADMIN_SECRET in .env)
exports.registerAdmin = async (req, res) => {
  try {
    if (!process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "ADMIN_SECRET is not configured" });
    }

    const { adminSecret, name, email, password, confirmPassword, dob, gender, phone } = req.body;
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid admin secret" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Confirm password does not match" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await getNextUserId();

    const user = await User.create({
      userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      dob,
      gender,
      role: "ADMIN"
    });

    res.status(201).json({
      message: "Register admin success",
      userId: user.userId,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is locked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: remember ? "30d" : "1d" }
    );

    res.json({
      message: "Login success",
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN WITH GOOGLE
exports.loginGoogle = async (req, res) => {
  try {
    const { credential, remember } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured" });
    }

    const https = require("https");
    const tokenInfo = await new Promise((resolve, reject) => {
      https
        .get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
            credential
          )}`,
          (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
              data += chunk;
            });
            resp.on("end", () => {
              try {
                const json = JSON.parse(data);
                resolve(json);
              } catch (err) {
                reject(err);
              }
            });
          }
        )
        .on("error", reject);
    });

    if (tokenInfo.aud !== googleClientId) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    if (tokenInfo.email_verified === "false") {
      return res.status(401).json({ message: "Google email is not verified" });
    }

    const normalizedEmail = String(tokenInfo.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Google email is missing" });
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const userId = await getNextUserId();
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        userId,
        name: tokenInfo.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        mustChangePassword: false,
        googleLoginVerified: false
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is locked" });
    }

    if (!user.googleLoginVerified) {
      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      user.googleLoginCodeHash = codeHash;
      user.googleLoginCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendGoogleLoginCodeEmail({
        to: user.email,
        name: user.name,
        code
      });

      return res.status(202).json({
        message: "A verification code has been sent to your email.",
        requiresVerification: true,
        email: user.email
      });
    }

    const token = issueToken(user, remember);

    res.json({
      message: "Login success",
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY GOOGLE LOGIN CODE
exports.verifyGoogleLoginCode = async (req, res) => {
  try {
    const { email, code, remember } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.googleLoginCodeHash || !user.googleLoginCodeExpires) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is locked" });
    }

    if (user.googleLoginCodeExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Code has expired" });
    }

    const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex");
    if (codeHash !== user.googleLoginCodeHash) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.googleLoginVerified = true;
    user.googleLoginCodeHash = undefined;
    user.googleLoginCodeExpires = undefined;
    await user.save();

    const token = issueToken(user, remember);
    res.json({
      message: "Login success",
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN WITH FACEBOOK
exports.loginFacebook = async (req, res) => {
  try {
    const { accessToken, remember } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Missing Facebook access token" });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) {
      return res
        .status(500)
        .json({ message: "FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured" });
    }

    const https = require("https");
    const debugInfo = await new Promise((resolve, reject) => {
      https
        .get(
          `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
            accessToken
          )}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`,
          (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
              data += chunk;
            });
            resp.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                reject(err);
              }
            });
          }
        )
        .on("error", reject);
    });

    if (!debugInfo?.data?.is_valid) {
      return res.status(401).json({ message: "Invalid Facebook token" });
    }

    if (String(debugInfo.data.app_id) !== String(appId)) {
      return res.status(401).json({ message: "Facebook token app mismatch" });
    }

    const profile = await new Promise((resolve, reject) => {
      https
        .get(
          `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(
            accessToken
          )}`,
          (resp) => {
            let data = "";
            resp.on("data", (chunk) => {
              data += chunk;
            });
            resp.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch (err) {
                reject(err);
              }
            });
          }
        )
        .on("error", reject);
    });

    const normalizedEmail = String(profile?.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({
        message: "Facebook email permission is required"
      });
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const userId = await getNextUserId();
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await User.create({
        userId,
        name: profile?.name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        mustChangePassword: false
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is locked" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: remember ? "30d" : "1d" }
    );

    res.json({
      message: "Login success",
      token,
      role: user.role,
      mustChangePassword: user.mustChangePassword
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      const codeHash = crypto.createHash("sha256").update(code).digest("hex");
      user.resetCodeHash = codeHash;
      user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      await sendResetCodeEmail({
        to: user.email,
        name: user.name,
        code
      });
    }

    res.json({
      message: "If the email exists, a verification code has been sent."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// VERIFY RESET CODE -> SEND NEW PASSWORD
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.resetCodeHash || !user.resetCodeExpires) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    if (user.resetCodeExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Code has expired" });
    }

    const codeHash = crypto.createHash("sha256").update(String(code)).digest("hex");
    if (codeHash !== user.resetCodeHash) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 6; i += 1) {
      tempPassword += chars[crypto.randomInt(0, chars.length)];
    }

    user.password = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    await sendForgotPasswordEmail({
      to: user.email,
      name: user.name,
      password: tempPassword
    });

    res.json({ message: "A new password has been sent to your email." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword, confirmPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Confirm password does not match" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    const resetTokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
    if (resetTokenHash !== user.resetPasswordToken) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PROMOTE USER -> ADMIN (dev only: requires ADMIN_SECRET in .env)
exports.promoteAdmin = async (req, res) => {
  try {
    if (!process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "ADMIN_SECRET is not configured" });
    }

    const { adminSecret, email } = req.body;
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ message: "Invalid admin secret" });
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "ADMIN";
    await user.save();

    res.json({ message: "Promote success", userId: user.userId, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
