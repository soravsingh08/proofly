import { Router } from "express";
import rateLimit from "express-rate-limit";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { summaryFor } from "../services/stats.js";
import { aiAvailable, generateSummary, fallbackSummary } from "../services/aiSummary.js";
import { answerQuestion } from "../services/assistant.js";

const router = Router();

// Owner-only: (re)generate the AI career summary, cache on user.
// Cached so profile views are instant and demo never waits on OpenAI.
// If the LLM is unconfigured or fails (e.g. quota), fall back to a
// deterministic summary built from the same logged data — never 502.
router.post("/summary", requireAuth, requireRole, async (req, res) => {
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
        error: "Log some work first. The AI summarizes proof, not promises",
      });

    let result;
    if (aiAvailable()) {
      try {
        result = await generateSummary(req.user, summary, recent);
      } catch (err) {
        console.error("ai summary error, using fallback:", err.message);
      }
    }
    if (!result) result = fallbackSummary(req.user, summary);

    req.user.aiSummary = { ...result, generatedAt: new Date() };
    await req.user.save();
    res.json({ aiSummary: req.user.aiSummary });
  } catch (err) {
    console.error("ai summary error:", err.message);
    res.status(502).json({ error: "AI generation failed, try again" });
  }
});

// Public site-helper chat (floating widget). Knowledge-base answers
// always work; LLM rewrites kick in when a funded key is configured.
const assistantLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });

router.post("/assistant", assistantLimiter, async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 500);
  if (!message) return res.status(400).json({ error: "Ask me something!" });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  try {
    res.json(await answerQuestion(message, history));
  } catch (err) {
    console.error("assistant error:", err.message);
    res.status(500).json({ error: "Assistant hiccuped, try again" });
  }
});

export default router;
