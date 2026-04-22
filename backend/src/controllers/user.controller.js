const User = require("../models/user.model");
const Counter = require("../models/counter.model");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendWelcomeEmail } = require("../utils/mailer");

const getNextUserId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { _id: "users" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be boolean" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = isActive;
    await user.save();
    res.json({ message: "Update success", userId: user.userId, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, role, phone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const randomBytes = crypto.randomBytes(6);
    let plainPassword = "";
    for (let i = 0; i < 6; i += 1) {
      plainPassword += chars[randomBytes[i] % chars.length];
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const userId = await getNextUserId();
    const normalizedRole =
      (role || "").toString().toUpperCase() === "ADMIN" ? "ADMIN" : "USER";

    const user = await User.create({
      userId,
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: normalizedRole,
      mustChangePassword: true
    });

    try {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        password: plainPassword,
        role: user.role
      });
    } catch (err) {
      await user.deleteOne();
      return res.status(500).json({ message: err.message || "Send email failed" });
    }

    res.status(201).json({
      message: "Create user success",
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email, dob, gender, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name is required" });
      }
      user.name = trimmedName;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Invalid email" });
      }
      if (normalizedEmail !== user.email) {
        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) {
          return res.status(400).json({ message: "Email already exists" });
        }
        user.email = normalizedEmail;
      }
    }

    if (dob !== undefined) {
      if (!dob) {
        user.dob = undefined;
      } else {
        const parsed = new Date(dob);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ message: "Invalid date of birth" });
        }
        user.dob = parsed;
      }
    }

    if (gender !== undefined) {
      if (!gender) {
        user.gender = undefined;
      } else {
        const normalizedGender = String(gender).toUpperCase();
        if (!["MALE", "FEMALE", "OTHER"].includes(normalizedGender)) {
          return res.status(400).json({ message: "Invalid gender" });
        }
        user.gender = normalizedGender;
      }
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone || "").trim();
      user.phone = trimmedPhone || undefined;
    }

    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({ message: "Profile updated successfully", user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
