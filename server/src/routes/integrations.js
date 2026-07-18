import { Router } from "express";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { githubUserExists, syncGithubUser } from "../services/github.js";

const router = Router();
router.use(requireAuth, requireRole);

// GitHub usernames: 1-39 chars, alphanumeric + inner hyphens
const GH_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

function requireDeveloper(req, res, next) {
  if (req.user.role !== "developer")
    return res.status(403).json({ error: "GitHub sync is for developers" });
  next();
}

router.put("/github", requireDeveloper, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  if (!GH_RE.test(username))
    return res.status(400).json({ error: "Invalid GitHub username" });
  try {
    if (!(await githubUserExists(username)))
      return res.status(404).json({ error: "No such GitHub user" });
  } catch {
    return res.status(502).json({ error: "GitHub is unreachable, try again" });
  }
  req.user.githubUsername = username;
  await req.user.save();
  res.json({ githubUsername: username });
});

router.post("/github/sync", requireDeveloper, async (req, res) => {
  if (!req.user.githubUsername)
    return res.status(400).json({ error: "Connect a GitHub username first" });
  try {
    res.json(await syncGithubUser(req.user));
  } catch (err) {
    console.error("github sync error:", err);
    res.status(502).json({ error: "Sync failed, try again" });
  }
});

// disconnect removes the synced history too — it came with the
// connection, it leaves with it
router.delete("/github", requireDeveloper, async (req, res) => {
  req.user.githubUsername = "";
  await req.user.save();
  await Contribution.deleteMany({ userId: req.user._id, source: "github_sync" });
  res.json({ ok: true });
});

export default router;
