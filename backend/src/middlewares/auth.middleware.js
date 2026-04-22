const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is locked" });
    }

    const requestPath = req.originalUrl || req.url || "";
    const allowPasswordChange =
      requestPath.startsWith("/api/users/me/password") ||
      requestPath.startsWith("/api/users/me") ||
      requestPath.startsWith("/api/auth/me");

    if (user.mustChangePassword && !allowPasswordChange) {
      return res.status(403).json({ message: "Password change required" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
