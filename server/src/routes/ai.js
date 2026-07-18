import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { summaryFor } from "../services/stats.js";
import { aiAvailable, generateSummary } from "../services/aiSummary.js";

const router = Router();

// Owner-only: (re)generate the AI career summary, cache on user.
// Cached so profile views are instant and demo never waits on OpenAI.
router.post("/summary", requireAuth, requireRole, async (req, res) => {
  if (!aiAvailable())
    return res.status(503).json({
      error: "AI is not configured — set OPENAI_API_KEY on the server",
    });
  try {
    const [summary, recent] = await Promise.all([
      summaryFor(req.user),
      Contribution.find({ userId: req.user._id })
        .sort({ date: -1 })
        .limit(15)
        .select("date metrics note verification"),
    ]);
    if (summary.totalContributions === 0)
      return res.status(400).json({
        error: "Log some work first — the AI summarizes proof, not promises",
      });

    const result = await generateSummary(req.user, summary, recent);
    req.user.aiSummary = { ...result, generatedAt: new Date() };
    await req.user.save();
    res.json({ aiSummary: req.user.aiSummary });
  } catch (err) {
    console.error("ai summary error:", err.message);
    res.status(502).json({ error: "AI generation failed — try again" });
  }
});

export default router;
