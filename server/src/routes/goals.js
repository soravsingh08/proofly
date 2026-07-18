import { Router } from "express";
import Goal from "../models/Goal.js";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getRole } from "../config/roles.js";
import { serverToday, startOfWeek } from "../services/dates.js";

const router = Router();
router.use(requireAuth, requireRole);

// Weekly targets per metric ("20 calls a week"). Progress resets
// every Monday.
router.get("/", async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).lean();
  if (goals.length === 0) return res.json({ goals: [] });

  // string compare is safe for yyyy-mm-dd
  const agg = await Contribution.aggregate([
    { $match: { userId: req.user._id, date: { $gte: startOfWeek(serverToday()) } } },
    { $project: { metrics: { $objectToArray: "$metrics" } } },
    { $unwind: "$metrics" },
    { $group: { _id: "$metrics.k", total: { $sum: "$metrics.v" } } },
  ]);
  const progress = {};
  for (const r of agg) progress[r._id] = r.total;

  const role = getRole(req.user.role);
  res.json({
    goals: goals.map((g) => {
      const metric = role.metrics.find((m) => m.key === g.metricKey);
      const done = progress[g.metricKey] || 0;
      return {
        metricKey: g.metricKey,
        label: metric?.label || g.metricKey,
        weeklyTarget: g.weeklyTarget,
        progress: done,
        pct: Math.min(100, Math.round((done / g.weeklyTarget) * 100)),
      };
    }),
  });
});

router.put("/", async (req, res) => {
  const { metricKey, weeklyTarget } = req.body || {};
  const role = getRole(req.user.role);
  if (!role.metrics.some((m) => m.key === metricKey))
    return res.status(400).json({ error: "Unknown metric for your profession" });
  const target = Math.round(Number(weeklyTarget));
  if (!Number.isFinite(target) || target < 1 || target > 1_000_000)
    return res.status(400).json({ error: "Target must be between 1 and 1,000,000" });

  const goal = await Goal.findOneAndUpdate(
    { userId: req.user._id, metricKey },
    { weeklyTarget: target },
    { new: true, upsert: true }
  );
  res.json({ goal: { metricKey: goal.metricKey, weeklyTarget: goal.weeklyTarget } });
});

router.delete("/:metricKey", async (req, res) => {
  const r = await Goal.deleteOne({ userId: req.user._id, metricKey: req.params.metricKey });
  if (r.deletedCount === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
