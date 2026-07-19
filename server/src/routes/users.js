import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLE_KEYS } from "../config/roles.js";
import { diffDays, isValidDateStr, serverToday } from "../services/dates.js";
import { publicUser } from "./auth.js";

const router = Router();

// Choose profession — locked once set (edge case A6)
router.put("/role", requireAuth, async (req, res) => {
  const { role } = req.body || {};
  if (!ROLE_KEYS.includes(role))
    return res.status(400).json({ error: "Unknown profession" });
  if (req.user.role)
    return res.status(400).json({ error: "Profession already chosen" });
  req.user.role = role;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.put("/profile", requireAuth, async (req, res) => {
  const headline = String(req.body?.headline ?? req.user.headline).slice(0, 120);
  const name = String(req.body?.name ?? req.user.name).trim().slice(0, 60);
  if (name) req.user.name = name;
  req.user.headline = headline;
  if (typeof req.body?.emailReminders === "boolean")
    req.user.emailReminders = req.body.emailReminders;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// ---- streak freezes: 2 per month, cover a missed day from the
// last week so one holiday doesn't kill a months-long streak.
// Frozen days bridge the streak but never count as activity.
const FREEZES_PER_MONTH = 2;

router.get("/streak-freezes", requireAuth, (req, res) => {
  const month = serverToday().slice(0, 7);
  const usedThisMonth = req.user.streakFreezes.filter((d) => d.startsWith(month));
  res.json({
    frozen: req.user.streakFreezes,
    remaining: Math.max(0, FREEZES_PER_MONTH - usedThisMonth.length),
  });
});

router.post("/streak-freeze", requireAuth, requireRole, async (req, res) => {
  const date = String(req.body?.date || "");
  if (!isValidDateStr(date))
    return res.status(400).json({ error: "Invalid date" });
  const back = diffDays(serverToday(), date);
  if (back < 1 || back > 7)
    return res.status(400).json({ error: "You can freeze a missed day from the last 7 days" });
  if (req.user.streakFreezes.includes(date))
    return res.status(400).json({ error: "That day is already frozen" });
  if (await Contribution.exists({ userId: req.user._id, date }))
    return res.status(400).json({ error: "You logged that day, no freeze needed" });
  const used = req.user.streakFreezes.filter((d) => d.startsWith(date.slice(0, 7))).length;
  if (used >= FREEZES_PER_MONTH)
    return res.status(400).json({ error: `Only ${FREEZES_PER_MONTH} freezes per month` });

  req.user.streakFreezes.push(date);
  await req.user.save();
  res.json({ frozen: req.user.streakFreezes });
});

export default router;
