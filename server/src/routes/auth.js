import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function publicUser(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    username: u.username,
    role: u.role,
    headline: u.headline,
  };
}

router.post("/register", async (req, res) => {
  try {
    let { name, email, password, username } = req.body || {};
    name = String(name || "").trim();
    email = String(email || "").trim().toLowerCase();
    username = String(username || "").trim().toLowerCase();

    if (!name || name.length > 60)
      return res.status(400).json({ error: "Name is required", field: "name" });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ error: "Valid email required", field: "email" });
    if (!USERNAME_RE.test(username))
      return res.status(400).json({
        error: "Username: 3-20 chars, lowercase letters, numbers, - or _",
        field: "username",
      });
    if (typeof password !== "string" || password.length < 6)
      return res.status(400).json({ error: "Password must be 6+ characters", field: "password" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, username, passwordHash });
    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    // duplicate key (edge case A1)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "email";
      return res.status(409).json({ error: `That ${field} is already taken`, field });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: "Invalid email or password" });
    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
export { publicUser };
