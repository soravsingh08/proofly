import { Router } from "express";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import SupportTicket from "../models/SupportTicket.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", async (req, res) => {
  const [users, contributions, openTickets] = await Promise.all([
    User.countDocuments(),
    Contribution.countDocuments(),
    SupportTicket.countDocuments({ status: "open" }),
  ]);
  res.json({ users, contributions, openTickets });
});

router.get("/users", async (req, res) => {
  const users = await User.find()
    .select("name email username role headline githubUsername isAdmin createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ users });
});

router.get("/tickets", async (req, res) => {
  const filter = ["open", "closed"].includes(req.query.status)
    ? { status: req.query.status }
    : {};
  const tickets = await SupportTicket.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ tickets });
});

router.put("/tickets/:id", async (req, res) => {
  const { status } = req.body || {};
  if (!["open", "closed"].includes(status))
    return res.status(400).json({ error: "Status must be open or closed" });
  const ticket = await SupportTicket.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  if (!ticket) return res.status(404).json({ error: "Not found" });
  res.json({ ticket });
});

export default router;
