import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { ROLE_KEYS } from "../config/roles.js";
import { publicUser } from "./auth.js";

const router = Router();

// Choose profession — locked once set (edge case A6)
router.put("/role", requireAuth, async (req, res) => {
  const { role } = req.body || {};
  if (!ROLE_KEYS.includes(role))
    return res.status(400).json({ error: "Unknown profession" });
  if (req.user.role)
    return res.status(400).json({ error: "Profession already chosen" });
  req.user.role = role;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.put("/profile", requireAuth, async (req, res) => {
  const headline = String(req.body?.headline ?? req.user.headline).slice(0, 120);
  const name = String(req.body?.name ?? req.user.name).trim().slice(0, 60);
  if (name) req.user.name = name;
  req.user.headline = headline;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

export default router;
