import { Router } from "express";
import User from "../models/User.js";
import { ROLE_KEYS } from "../config/roles.js";
import { computeStreaks, totalsByUser } from "../services/stats.js";

const router = Router();

// Per-role only (E1). Rank: streak desc, activeDays desc,
// weighted total desc (E2). Public — no auth needed.
router.get("/", async (req, res) => {
  const role = String(req.query.role || "");
  if (!ROLE_KEYS.includes(role))
    return res.status(400).json({ error: "Unknown role" });

  const users = await User.find({ role })
    .select("name username headline streakFreezes")
    .limit(100)
    .lean();
  const totals = await totalsByUser(users.map((u) => u._id));

  const rows = users.map((u) => {
    const t = totals.get(String(u._id)) || new Map();
    const streaks = computeStreaks(t, u.streakFreezes);
    let weightedSum = 0;
    for (const v of t.values()) weightedSum += v;
    return {
      name: u.name,
      username: u.username,
      headline: u.headline,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      activeDays: t.size,
      weightedSum,
    };
  });

  rows.sort(
    (a, b) =>
      b.currentStreak - a.currentStreak ||
      b.activeDays - a.activeDays ||
      b.weightedSum - a.weightedSum
  );

  res.json({ leaderboard: rows.slice(0, 20) });
});

export default router;
