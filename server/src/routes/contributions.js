import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeMetrics } from "../config/roles.js";
import { isAllowedLogDate } from "../services/dates.js";

const router = Router();
router.use(requireAuth, requireRole);

router.post("/", async (req, res) => {
  try {
    const { date, metrics, note } = req.body || {};

    // future dates blocked, backfill max 30 days (B5, B6)
    if (!isAllowedLogDate(date))
      return res.status(400).json({
        error: "Date must be today or within the last 30 days",
      });

    // whitelist + clamp + reject all-zero (B1, B2, B3)
    const clean = sanitizeMetrics(req.user.role, metrics);
    if (!clean)
      return res.status(400).json({ error: "Log at least one metric" });

    const contribution = await Contribution.create({
      userId: req.user._id,
      role: req.user.role,
      date,
      metrics: clean.metrics,
      weightedTotal: clean.weightedTotal,
      note: String(note || "").slice(0, 280),
    });
    res.status(201).json({ contribution });
  } catch (err) {
    console.error("create contribution error:", err);
    res.status(500).json({ error: "Could not save contribution" });
  }
});

router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const contributions = await Contribution.find({ userId: req.user._id })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
  res.json({ contributions });
});

router.delete("/:id", async (req, res) => {
  // scoped to owner — can't delete others' entries
  const result = await Contribution.deleteOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
