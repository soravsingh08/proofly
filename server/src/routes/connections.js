import { Router } from "express";
import Connection from "../models/Connection.js";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getRole } from "../config/roles.js";
import {
  extractChannelId,
  fetchSheetRows,
  repoExists,
  syncConnection,
} from "../services/connections.js";

const router = Router();
router.use(requireAuth, requireRole);

const MAX_CONNECTIONS = 10;
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

router.get("/", async (req, res) => {
  const connections = await Connection.find({ userId: req.user._id })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ connections });
});

// CSV starter for "connect a sheet" — headers the parser accepts,
// per the user's own role. Import into Google Sheets, publish, done.
router.get("/sheet-template", (req, res) => {
  const role = getRole(req.user.role);
  const headers = ["date", ...role.metrics.map((m) => m.label)];
  const sample = ["2026-01-31", ...role.metrics.map(() => "0")];
  res
    .set({
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="proofly-${req.user.role}-tracker.csv"`,
    })
    .send(`${headers.join(",")}\n${sample.join(",")}\n`);
});

router.post("/", async (req, res) => {
  try {
    const { type } = req.body || {};
    if ((await Connection.countDocuments({ userId: req.user._id })) >= MAX_CONNECTIONS)
      return res.status(400).json({ error: `Max ${MAX_CONNECTIONS} connections` });

    let label = "";
    const config = {};

    if (type === "github_repo") {
      const repo = String(req.body.repo || "").trim();
      if (!REPO_RE.test(repo))
        return res.status(400).json({ error: "Use the owner/repo format" });
      if (!(await repoExists(repo)))
        return res.status(404).json({ error: "Repo not found (private repos aren't supported yet)" });
      config.repo = repo;
      label = repo;
    } else if (type === "sheet") {
      const url = String(req.body.url || "").trim();
      if (!/^https?:\/\/\S+$/.test(url))
        return res.status(400).json({ error: "Paste a valid sheet link" });
      // validates reachability + parseability right now
      await fetchSheetRows(url, getRole(req.user.role));
      config.url = url;
      label = "Google Sheet";
    } else if (type === "youtube") {
      if (!getRole(req.user.role).metrics.some((m) => m.key === "video"))
        return res.status(400).json({ error: "YouTube tracking is for roles with a videos metric" });
      const channelId = extractChannelId(req.body.url || "");
      if (!channelId)
        return res.status(400).json({ error: "Paste a channel link containing the UC… id" });
      config.channelId = channelId;
      label = `YouTube ${channelId.slice(0, 10)}…`;
    } else {
      return res.status(400).json({ error: "Unknown connection type" });
    }

    const conn = await Connection.create({ userId: req.user._id, type, label, config });
    const { synced } = await syncConnection(conn, req.user);
    res.status(201).json({ connection: conn, synced });
  } catch (err) {
    if (err.friendly) return res.status(400).json({ error: err.message });
    console.error("connection create error:", err);
    res.status(500).json({ error: "Couldn't add that connection" });
  }
});

router.post("/:id/sync", async (req, res) => {
  const conn = await Connection.findOne({ _id: req.params.id, userId: req.user._id });
  if (!conn) return res.status(404).json({ error: "Not found" });
  try {
    res.json(await syncConnection(conn, req.user));
  } catch (err) {
    if (err.friendly) return res.status(400).json({ error: err.message });
    console.error("connection sync error:", err);
    res.status(502).json({ error: "Sync failed, try again" });
  }
});

// disconnect removes the synced history too
router.delete("/:id", async (req, res) => {
  const conn = await Connection.findOne({ _id: req.params.id, userId: req.user._id });
  if (!conn) return res.status(404).json({ error: "Not found" });
  await Contribution.deleteMany({ connectionId: conn._id });
  await conn.deleteOne();
  res.json({ ok: true });
});

export default router;
