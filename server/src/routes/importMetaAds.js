import { Router } from "express";
import multer from "multer";
import Contribution from "../models/Contribution.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  buildTemplate,
  parseMetaAdsXlsx,
  previewStats,
} from "../services/excelParser.js";

const router = Router();

// memory storage, 2MB, .xlsx only (G1) — nothing touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.originalname.toLowerCase().endsWith(".xlsx");
    cb(ok ? null : new Error("Only .xlsx files are accepted"), ok);
  },
});

// Template download — same column list the parser validates (G2)
router.get("/template", (req, res) => {
  const buf = buildTemplate();
  res
    .set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="proofly-meta-ads-template.xlsx"',
    })
    .send(buf);
});

function requireMetaAds(req, res, next) {
  if (req.user.role !== "meta_ads")
    return res.status(403).json({ error: "Import is for Meta Ads specialists" });
  next();
}

// Step 1: upload -> parse -> preview (nothing saved yet)
router.post(
  "/preview",
  requireAuth,
  requireRole,
  requireMetaAds,
  (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err)
        return res.status(400).json({ error: err.message || "Upload failed" });
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      try {
        const { rows, skipped } = parseMetaAdsXlsx(req.file.buffer);
        // send rows back to the client; client returns them on confirm.
        // (stateless server — no session storage needed)
        res.json({ preview: previewStats(rows), skipped, rows });
      } catch (e) {
        // never 500 on a bad file (G7)
        const msg = e.friendly ? e.message : "Couldn't read this file. Use the template.";
        res.status(400).json({ error: msg });
      }
    });
  }
);

// Step 2: confirm -> idempotent import (G5): wipe previous
// excel_import rows, insert the new batch as verified.
router.post(
  "/confirm",
  requireAuth,
  requireRole,
  requireMetaAds,
  async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      if (rows.length === 0 || rows.length > 1000)
        return res.status(400).json({ error: "Nothing to import" });

      // re-validate everything server-side — client payload is untrusted
      const { sanitizeMetrics } = await import("../config/roles.js");
      const { isValidDateStr } = await import("../services/dates.js");
      const docs = [];
      const seen = new Set();
      for (const r of rows) {
        if (!isValidDateStr(r?.date) || seen.has(r.date)) continue;
        const clean = sanitizeMetrics("meta_ads", r.metrics);
        if (!clean) continue;
        seen.add(r.date);
        docs.push({
          userId: req.user._id,
          role: "meta_ads",
          date: r.date,
          metrics: clean.metrics,
          weightedTotal: clean.weightedTotal,
          note: "Imported from Meta Ads report",
          verification: "imported",
          source: "excel_import",
        });
      }
      if (docs.length === 0)
        return res.status(400).json({ error: "No valid rows to import" });

      await Contribution.deleteMany({
        userId: req.user._id,
        source: "excel_import",
      });
      await Contribution.insertMany(docs);
      res.json({ imported: docs.length });
    } catch (err) {
      console.error("import confirm error:", err);
      res.status(500).json({ error: "Import failed" });
    }
  }
);

export default router;
