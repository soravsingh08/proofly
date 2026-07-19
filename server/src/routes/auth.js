import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import passport from "../config/passport.js";

const router = Router();

// brute-force guard: 20 attempts / 10 min per IP
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again in a few minutes" },
});

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
    githubUsername: u.githubUsername,
    emailReminders: u.emailReminders,
    isAdmin: u.isAdmin,
    metaConnected: Boolean(u.metaConnection?.accessToken),
    metaAccountName: u.metaConnection?.adAccountName || "",
    metaLastSyncAt: u.metaConnection?.lastSyncAt || null,
  };
}

router.post("/register", authLimiter, async (req, res) => {
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

router.post("/login", authLimiter, (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      console.error("login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
    if (!user) return res.status(401).json({ error: info?.message });
    return res.json({ token: signToken(user), user: publicUser(user) });
  })(req, res, next);
});

// One-click demo login — one showcase account per profession so
// judges can explore every field (seeded via npm run seed-demo).
// Strict whitelist: never logs into arbitrary accounts.
const DEMO_USERS = {
  developer: "arjun",
  digital_marketing: "nisha",
  sales: "rohan",
  hr: "meera",
  meta_ads: "kabir",
  designer: "zoya",
};

router.post("/demo", authLimiter, async (req, res) => {
  const role = String(req.body?.role || "developer");
  const username = DEMO_USERS[role] || process.env.DEMO_USERNAME || "arjun";
  const user = await User.findOne({ username });
  if (!user) return res.status(503).json({ error: "Demo account is not set up" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 6)
    return res.status(400).json({ error: "New password must be 6+ characters", field: "newPassword" });

  const ok = await bcrypt.compare(String(currentPassword || ""), req.user.passwordHash);
  if (!ok)
    return res.status(401).json({ error: "Current password is incorrect", field: "currentPassword" });

  req.user.passwordHash = await bcrypt.hash(newPassword, 10);
  await req.user.save();
  res.json({ ok: true });
});

export default router;
export { publicUser };
