import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sanitizeMetrics } from "../config/roles.js";
import {
  metaConfigured,
  oauthUrl,
  exchangeCode,
  firstAdAccount,
  dailyInsights,
} from "../services/metaApi.js";

const router = Router();

function requireMetaAds(req, res, next) {
  if (req.user.role !== "meta_ads")
    return res.status(403).json({ error: "Meta sync is for Meta Ads specialists" });
  next();
}

// Step 1: client asks for the OAuth dialog URL.
// state = short JWT so the callback can identify the user
// without a session (the redirect comes from facebook.com).
router.get("/oauth-url", requireAuth, requireRole, requireMetaAds, (req, res) => {
  if (!metaConfigured())
    return res.status(503).json({
      error: "Meta is not configured, set META_APP_ID / META_APP_SECRET",
    });
  const state = jwt.sign({ id: req.user._id, meta: true }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });
  res.json({ url: oauthUrl(state) });
});

// Step 2: facebook redirects here. Exchange code, store the
// connection, bounce back to the client import page.
router.get("/callback", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    const { code, state, error_description } = req.query;
    if (!code) throw new Error(error_description || "OAuth was cancelled");

    const payload = jwt.verify(String(state), process.env.JWT_SECRET);
    if (!payload.meta) throw new Error("Bad state");
    const user = await User.findById(payload.id);
    if (!user) throw new Error("User not found");

    const accessToken = await exchangeCode(String(code));
    const account = await firstAdAccount(accessToken);
    user.metaConnection = {
      adAccountId: account.id,
      adAccountName: account.name,
      accessToken,
      connectedAt: new Date(),
      lastSyncAt: null,
    };
    await user.save();
    res.redirect(`${clientUrl}/import?meta=connected`);
  } catch (err) {
    console.error("meta callback error:", err.message);
    res.redirect(`${clientUrl}/import?meta=error&reason=${encodeURIComponent(err.message)}`);
  }
});

// Step 3: pull last-90d daily insights into contributions.
// Idempotent: wipes previous meta_api rows first.
router.post("/sync", requireAuth, requireRole, requireMetaAds, async (req, res) => {
  const conn = req.user.metaConnection;
  if (!conn?.accessToken)
    return res.status(400).json({ error: "Connect your Meta account first" });
  try {
    const rows = await dailyInsights(conn.adAccountId, conn.accessToken);
    const docs = [];
    for (const r of rows) {
      const clean = sanitizeMetrics("meta_ads", r.metrics);
      if (!clean) continue;
      docs.push({
        userId: req.user._id,
        role: "meta_ads",
        date: r.date,
        metrics: clean.metrics,
        weightedTotal: clean.weightedTotal,
        note: `Synced from Meta Ads (${conn.adAccountName})`,
        verification: "synced",
        source: "meta_api",
      });
    }
    await Contribution.deleteMany({ userId: req.user._id, source: "meta_api" });
    if (docs.length) await Contribution.insertMany(docs);

    req.user.metaConnection.lastSyncAt = new Date();
    await req.user.save();
    res.json({ synced: docs.length, account: conn.adAccountName });
  } catch (err) {
    console.error("meta sync error:", err.message);
    res.status(502).json({ error: `Meta sync failed: ${err.message}` });
  }
});

router.delete("/disconnect", requireAuth, requireRole, requireMetaAds, async (req, res) => {
  req.user.metaConnection = undefined;
  await req.user.save();
  await Contribution.deleteMany({ userId: req.user._id, source: "meta_api" });
  res.json({ ok: true });
});

export default router;
