import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeMetrics } from "../config/roles.js";
import { isAllowedLogDate, isValidDateStr } from "../services/dates.js";

const router = Router();
router.use(requireAuth, requireRole);

const EVIDENCE_RE = /^https?:\/\/\S+$/;

router.post("/", async (req, res) => {
  try {
    const { date, metrics, note, evidenceUrl } = req.body || {};

    // future dates blocked, backfill max 30 days (B5, B6)
    if (!isAllowedLogDate(date))
      return res.status(400).json({
        error: "Date must be today or within the last 30 days",
      });

    // whitelist + clamp + reject all-zero (B1, B2, B3)
    const clean = sanitizeMetrics(req.user.role, metrics);
    if (!clean)
      return res.status(400).json({ error: "Log at least one metric" });

    // a valid proof link upgrades the entry to "evidence" (rung 2)
    const evidence = String(evidenceUrl || "").trim().slice(0, 300);
    const verified = EVIDENCE_RE.test(evidence);

    const contribution = await Contribution.create({
      userId: req.user._id,
      role: req.user.role,
      date,
      metrics: clean.metrics,
      weightedTotal: clean.weightedTotal,
      note: String(note || "").slice(0, 280),
      evidenceUrl: verified ? evidence : "",
      verification: verified ? "evidence" : "self_reported",
    });
    res.status(201).json({ contribution });
  } catch (err) {
    console.error("create contribution error:", err);
    res.status(500).json({ error: "Could not save contribution" });
  }
});

// ?date=yyyy-mm-dd filters to one day (log history filter)
router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const filter = { userId: req.user._id };
  if (isValidDateStr(req.query.date)) filter.date = req.query.date;
  const contributions = await Contribution.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .limit(limit);
  res.json({ contributions });
});

// attach proof after the fact — self_reported becomes evidence,
// imported entries stay imported (higher rung)
router.put("/:id/evidence", async (req, res) => {
  const url = String(req.body?.evidenceUrl || "").trim().slice(0, 300);
  if (!EVIDENCE_RE.test(url))
    return res.status(400).json({ error: "Evidence must be a valid http(s) link" });

  const contribution = await Contribution.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!contribution) return res.status(404).json({ error: "Not found" });

  contribution.evidenceUrl = url;
  if (contribution.verification === "self_reported")
    contribution.verification = "evidence";
  await contribution.save();
  res.json({ contribution });
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
