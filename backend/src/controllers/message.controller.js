const Message = require("../models/message.model");
const User = require("../models/user.model");

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content || !content.toString().trim()) {
      return res.status(400).json({ message: "Missing receiverId or content" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ message: "User not found" });
    if (req.user?.role !== "ADMIN" && receiver.role !== "ADMIN") {
      return res.status(403).json({ message: "Users can only message admins" });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      content: content.toString().trim()
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listMyMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ receiverId: req.user._id }, { senderId: req.user._id }]
    })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.listUserMessages = async (req, res) => {
  try {
    const userId = req.params.id;
    const messages = await Message.find({
      $or: [{ receiverId: userId }, { senderId: userId }]
    })
      .populate("senderId", "name email role")
      .populate("receiverId", "name email role")
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markConversationRead = async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ message: "Missing userId" });
    const adminId = req.user?._id;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });
    const now = new Date();
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: adminId,
        $or: [{ readAt: { $exists: false } }, { readAt: null }]
      },
      { $set: { readAt: now } }
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
