import { Router } from "express";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import { ROLE_KEYS } from "../config/roles.js";
import { badgesFor } from "../config/badges.js";
import {
  computeScore,
  computeStreaks,
  dailyTotals,
  heatmapPayload,
  summaryFor,
  totalsByUser,
} from "../services/stats.js";
import { buildProfileCard } from "../services/svgCard.js";

const router = Router();

// Recruiter search: filter by profession, name and consistency.
// Must come before /:username so "search" never matches as one.
router.get("/search", async (req, res) => {
  const role = String(req.query.role || "");
  const q = String(req.query.q || "").trim();
  const minStreak = Math.max(0, Number(req.query.minStreak) || 0);
  if (role && !ROLE_KEYS.includes(role))
    return res.status(400).json({ error: "Unknown role" });

  const filter = { role: role || { $ne: null } };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { username: rx }];
  }
  const users = await User.find(filter)
    .select("name username headline role streakFreezes")
    .limit(200)
    .lean();
  const totals = await totalsByUser(users.map((u) => u._id));

  const results = users
    .map((u) => {
      const t = totals.get(String(u._id)) || new Map();
      const streaks = computeStreaks(t, u.streakFreezes);
      return {
        name: u.name,
        username: u.username,
        headline: u.headline,
        role: u.role,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        activeDays: t.size,
      };
    })
    .filter((r) => r.currentStreak >= minStreak)
    .sort((a, b) => b.currentStreak - a.currentStreak || b.activeDays - a.activeDays);

  res.json({ results: results.slice(0, 20) });
});

// Embeddable profile card — <img src=".../u/card.svg"> anywhere:
// LinkedIn articles, portfolios, GitHub READMEs, resumes.
router.get("/:username/card.svg", async (req, res) => {
  const username = String(req.params.username || "").toLowerCase();
  const user = await User.findOne({ username });
  if (!user || !user.role)
    return res.status(404).json({ error: "Profile not found" });

  const totals = await dailyTotals(user._id);
  const streaks = computeStreaks(totals, user.streakFreezes);
  let weightedSum = 0;
  for (const v of totals.values()) weightedSum += v;
  const score = computeScore({
    activeDays: totals.size,
    weightedSum,
    currentStreak: streaks.current,
  });

  res
    .set({
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600", // embeds hammer this
    })
    .send(buildProfileCard({ user, totals, streaks, score }));
});

// The demo centerpiece: EVERYTHING for a public profile in one
// call, no auth. Explicit whitelist — never leak email (F4).
router.get("/:username", async (req, res) => {
  const username = String(req.params.username || "").toLowerCase();
  const user = await User.findOne({ username });
  // no user OR user never picked a role -> same 404 (F1, F2)
  if (!user || !user.role)
    return res.status(404).json({ error: "Profile not found" });

  const [summary, totals, recent] = await Promise.all([
    summaryFor(user),
    dailyTotals(user._id),
    Contribution.find({ userId: user._id })
      .sort({ date: -1, createdAt: -1 })
      .limit(10)
      .select("date metrics note verification source evidenceUrl"),
  ]);

  res.json({
    profile: {
      name: user.name,
      username: user.username,
      headline: user.headline,
      role: user.role,
      joined: user.createdAt,
    },
    aiSummary: user.aiSummary?.text ? user.aiSummary : null,
    summary,
    badges: badgesFor(summary).filter((b) => b.earned),
    heatmap: heatmapPayload(totals),
    recent,
  });
});

export default router;
