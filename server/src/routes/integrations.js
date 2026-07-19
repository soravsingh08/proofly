import { Router } from "express";
import Contribution from "../models/Contribution.js";
import Connection from "../models/Connection.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { githubUserExists } from "../services/github.js";
import { syncConnection } from "../services/connections.js";

const router = Router();
router.use(requireAuth, requireRole);

// GitHub usernames: 1-39 chars, alphanumeric + inner hyphens
const GH_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

function requireDeveloper(req, res, next) {
  if (req.user.role !== "developer")
    return res.status(403).json({ error: "GitHub sync is for developers" });
  next();
}

// Save the username used to filter repo commits by author — in a
// shared repo only YOUR commits should count. Changing it re-syncs
// every connected repo with the new filter.
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

  let resynced = 0;
  const repos = await Connection.find({ userId: req.user._id, type: "github_repo" });
  for (const conn of repos) {
    try {
      await syncConnection(conn, req.user);
      resynced++;
    } catch (err) {
      console.error(`re-sync failed (${conn.label}):`, err.message);
    }
  }
  res.json({ githubUsername: username, resynced });
});

router.delete("/github", requireDeveloper, async (req, res) => {
  req.user.githubUsername = "";
  await req.user.save();
  // legacy rows from the retired profile-events sync
  await Contribution.deleteMany({ userId: req.user._id, source: "github_sync" });
  res.json({ ok: true });
});

export default router;
