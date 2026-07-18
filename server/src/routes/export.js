import { Router } from "express";
import Contribution from "../models/Contribution.js";
import Goal from "../models/Goal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { badgesFor } from "../config/badges.js";
import {
  computeScore,
  computeStreaks,
  dailyTotals,
  summaryFor,
} from "../services/stats.js";
import { buildProfileCard } from "../services/svgCard.js";
import { buildProfileHtml } from "../services/profileExport.js";

const router = Router();
router.use(requireAuth, requireRole);

// Downloadable proof-of-work report (self-contained HTML — email
// it, attach it, or print to PDF). Recruiter-facing.
router.get("/profile", async (req, res) => {
  const totals = await dailyTotals(req.user._id);
  const [summary, contributions, verificationAgg] = await Promise.all([
    summaryFor(req.user, totals),
    Contribution.find({ userId: req.user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(30)
      .select("date metrics note verification evidenceUrl")
      .lean(),
    Contribution.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$verification", n: { $sum: 1 } } },
    ]),
  ]);

  const verificationCounts = {};
  for (const r of verificationAgg) verificationCounts[r._id] = r.n;

  const streaks = computeStreaks(totals, req.user.streakFreezes);
  let weightedSum = 0;
  for (const v of totals.values()) weightedSum += v;
  const cardSvg = buildProfileCard({
    user: req.user,
    totals,
    streaks,
    score: computeScore({
      activeDays: totals.size,
      weightedSum,
      currentStreak: streaks.current,
    }),
  });

  const html = buildProfileHtml({
    user: req.user,
    summary,
    badges: badgesFor(summary).filter((b) => b.earned),
    cardSvg,
    contributions,
    verificationCounts,
  });

  res
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="proofly-${req.user.username}.html"`,
    })
    .send(html);
});

// Full data takeout — everything we store about the user, as JSON.
router.get("/data", async (req, res) => {
  const [summary, contributions, goals] = await Promise.all([
    summaryFor(req.user),
    Contribution.find({ userId: req.user._id })
      .sort({ date: 1 })
      .select("-userId -__v")
      .lean(),
    Goal.find({ userId: req.user._id }).select("metricKey weeklyTarget").lean(),
  ]);

  res
    .set(
      "Content-Disposition",
      `attachment; filename="proofly-${req.user.username}-data.json"`
    )
    .json({
      exportedAt: new Date().toISOString(),
      profile: {
        name: req.user.name,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
        headline: req.user.headline,
        githubUsername: req.user.githubUsername,
        joined: req.user.createdAt,
      },
      summary,
      streakFreezes: req.user.streakFreezes,
      goals,
      contributions,
    });
});

export default router;
