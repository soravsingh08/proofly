import { Router } from "express";
import User from "../models/User.js";
import { ROLE_KEYS } from "../config/roles.js";
import { dailyTotals, computeStreaks } from "../services/stats.js";

const router = Router();

// Per-role only (E1). Rank: streak desc, activeDays desc,
// weighted total desc (E2). Public — no auth needed.
router.get("/", async (req, res) => {
  const role = String(req.query.role || "");
  if (!ROLE_KEYS.includes(role))
    return res.status(400).json({ error: "Unknown role" });

  const users = await User.find({ role }).limit(100);
  const rows = await Promise.all(
    users.map(async (u) => {
      const totals = await dailyTotals(u._id);
      const streaks = computeStreaks(totals);
      let weightedSum = 0;
      for (const v of totals.values()) weightedSum += v;
      return {
        name: u.name,
        username: u.username,
        headline: u.headline,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        activeDays: totals.size,
        weightedSum,
      };
    })
  );

  rows.sort(
    (a, b) =>
      b.currentStreak - a.currentStreak ||
      b.activeDays - a.activeDays ||
      b.weightedSum - a.weightedSum
  );

  res.json({ leaderboard: rows.slice(0, 20) });
});

export default router;
