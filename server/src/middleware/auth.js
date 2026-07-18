import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function signToken(user) {
  // 7-day TTL — never expires mid-demo (A4)
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Most routes need a chosen role (A5)
export function requireRole(req, res, next) {
  if (!req.user.role)
    return res.status(403).json({ error: "Choose a profession first" });
  next();
}
