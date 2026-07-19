import { Router } from "express";
import PlannerTask from "../models/PlannerTask.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/planner?from=yyyy-mm-dd&to=yyyy-mm-dd
router.get("/", async (req, res) => {
  const { from, to } = req.query;
  const q = { userId: req.user._id };
  if (from || to)
    q.date = {
      ...(DATE_RE.test(from) ? { $gte: String(from) } : {}),
      ...(DATE_RE.test(to) ? { $lte: String(to) } : {}),
    };
  const tasks = await PlannerTask.find(q).sort({ date: 1, createdAt: 1 }).limit(200);
  res.json({ tasks });
});

router.post("/", async (req, res) => {
  const text = String(req.body?.text || "").trim().slice(0, 140);
  const date = String(req.body?.date || "");
  if (!text) return res.status(400).json({ error: "Write the task first" });
  if (!DATE_RE.test(date)) return res.status(400).json({ error: "Valid date required" });
  const count = await PlannerTask.countDocuments({ userId: req.user._id, date });
  if (count >= 12) return res.status(400).json({ error: "That day is full, 12 tasks max" });
  const task = await PlannerTask.create({ userId: req.user._id, date, text });
  res.status(201).json({ task });
});

router.patch("/:id", async (req, res) => {
  const task = await PlannerTask.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (typeof req.body?.done === "boolean") task.done = req.body.done;
  if (typeof req.body?.text === "string" && req.body.text.trim())
    task.text = req.body.text.trim().slice(0, 140);
  await task.save();
  res.json({ task });
});

router.delete("/:id", async (req, res) => {
  await PlannerTask.deleteOne({ _id: req.params.id, userId: req.user._id });
  res.json({ ok: true });
});

export default router;
