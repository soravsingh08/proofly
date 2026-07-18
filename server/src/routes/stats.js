import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { badgesFor } from "../config/badges.js";
import {
  computeStreaks,
  dailyTotals,
  heatmapPayload,
  summaryFor,
} from "../services/stats.js";
import { addDays, diffDays, serverToday } from "../services/dates.js";

const router = Router();
router.use(requireAuth, requireRole);

router.get("/heatmap", async (req, res) => {
  const totals = await dailyTotals(req.user._id);
  res.json({ days: heatmapPayload(totals) });
});

router.get("/summary", async (req, res) => {
  res.json({ summary: await summaryFor(req.user) });
});

router.get("/badges", async (req, res) => {
  res.json({ badges: badgesFor(await summaryFor(req.user)) });
});

// The "help" pillar: rolling week-vs-week trend, best day, and
// nudges the client can show as-is.
router.get("/insights", async (req, res) => {
  const totals = await dailyTotals(req.user._id);
  const streaks = computeStreaks(totals, req.user.streakFreezes);
  const today = serverToday();

  const thisWeek = { activeDays: 0, weightedTotal: 0 };
  const lastWeek = { activeDays: 0, weightedTotal: 0 };
  let bestDay = null;
  let lastLog = null;
  for (const [d, v] of totals) {
    const back = diffDays(today, d);
    if (back <= 6) {
      thisWeek.activeDays++;
      thisWeek.weightedTotal += v;
    } else if (back <= 13) {
      lastWeek.activeDays++;
      lastWeek.weightedTotal += v;
    }
    if (!bestDay || v > bestDay.total) bestDay = { date: d, total: v };
    if (!lastLog || d > lastLog) lastLog = d;
  }

  // string compare is safe for yyyy-mm-dd
  const agg = await Contribution.aggregate([
    { $match: { userId: req.user._id, date: { $gte: addDays(today, -6) } } },
    { $project: { metrics: { $objectToArray: "$metrics" } } },
    { $unwind: "$metrics" },
    { $group: { _id: "$metrics.k", total: { $sum: "$metrics.v" } } },
  ]);
  const metricsThisWeek = {};
  for (const r of agg) metricsThisWeek[r._id] = r.total;

  const changePct =
    lastWeek.weightedTotal > 0
      ? Math.round(
          ((thisWeek.weightedTotal - lastWeek.weightedTotal) / lastWeek.weightedTotal) * 100
        )
      : null;
  const daysSinceLastLog = lastLog ? diffDays(today, lastLog) : null;

  const nudges = [];
  if (totals.size === 0) {
    nudges.push("Log your first contribution to start your graph.");
  } else {
    if (daysSinceLastLog >= 3)
      nudges.push(`It's been ${daysSinceLastLog} days since your last log.`);
    else if (streaks.current > 0 && !totals.has(today))
      nudges.push(`Log today to keep your ${streaks.current}-day streak alive.`);
    if (changePct !== null && changePct <= -30)
      nudges.push(`Activity is down ${-changePct}% vs last week.`);
    if (changePct !== null && changePct >= 30)
      nudges.push(`You're up ${changePct}% on last week — keep pushing.`);
  }

  res.json({
    thisWeek: { ...thisWeek, metrics: metricsThisWeek },
    lastWeek,
    changePct,
    bestDay,
    daysSinceLastLog,
    currentStreak: streaks.current,
    nudges,
  });
});

export default router;
