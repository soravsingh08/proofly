import { Router } from "express";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import { dailyTotals, heatmapPayload, summaryFor } from "../services/stats.js";

const router = Router();

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
      .select("date metrics note verification source"),
  ]);

  res.json({
    profile: {
      name: user.name,
      username: user.username,
      headline: user.headline,
      role: user.role,
      joined: user.createdAt,
    },
    summary,
    heatmap: heatmapPayload(totals),
    recent,
  });
});

export default router;
