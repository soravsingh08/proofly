import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { dailyTotals, heatmapPayload, summaryFor } from "../services/stats.js";

const router = Router();
router.use(requireAuth, requireRole);

router.get("/heatmap", async (req, res) => {
  const totals = await dailyTotals(req.user._id);
  res.json({ days: heatmapPayload(totals) });
});

router.get("/summary", async (req, res) => {
  res.json({ summary: await summaryFor(req.user) });
});

export default router;
