import { Router } from "express";
import rateLimit from "express-rate-limit";
import SupportTicket from "../models/SupportTicket.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { SITE } from "../config/site.js";

const router = Router();

const EMAIL_RE = /^\S+@\S+\.\S+$/;

// spam guard: 5 tickets / 15 min per IP
const ticketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages, please try again later" },
});

// Public — guests welcome. Logged-in users can skip name/email
// (pulled from their account) and the ticket links to them.
router.post("/", ticketLimiter, optionalAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || req.user?.name || "").trim();
    const email = String(body.email || req.user?.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();
    const topic = SITE.supportTopics.includes(body.topic) ? body.topic : "general";

    if (!name || name.length > 60)
      return res.status(400).json({ error: "Name is required", field: "name" });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ error: "Valid email required", field: "email" });
    if (!message || message.length > 2000)
      return res.status(400).json({ error: "Message is required (max 2000 chars)", field: "message" });

    const ticket = await SupportTicket.create({
      userId: req.user?._id || null,
      name,
      email,
      topic,
      message,
    });
    res.status(201).json({
      ticket: { id: ticket._id, status: ticket.status, createdAt: ticket.createdAt },
    });
  } catch (err) {
    console.error("support ticket error:", err);
    res.status(500).json({ error: "Could not send your message" });
  }
});

// Own tickets only — scoped by userId, never anyone else's
router.get("/mine", requireAuth, async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("topic message status createdAt");
  res.json({ tickets });
});

export default router;
