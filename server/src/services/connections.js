import * as XLSX from "xlsx";
import Contribution from "../models/Contribution.js";
import { getRole, sanitizeMetrics } from "../config/roles.js";
import { isValidDateStr } from "./dates.js";

// ============================================================
// Connection fetchers — every source is free, no OAuth:
//   github_repo : public commits API (optional GITHUB_TOKEN env
//                 raises the rate limit from 60 to 5000/hr)
//   sheet       : a shared/published Google Sheet fetched as CSV
//   youtube     : the channel's public RSS feed (last ~15 uploads)
// ============================================================

const GH_HEADERS = { "User-Agent": "proofly", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) GH_HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

export async function repoExists(repo) {
  const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: GH_HEADERS });
  return r.ok;
}

async function fetchRepoCommits(repo, author) {
  const since = new Date(Date.now() - 365 * 86400000).toISOString();
  const byDate = new Map();
  for (let page = 1; page <= 3; page++) {
    let url = `https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}&since=${since}`;
    if (author) url += `&author=${encodeURIComponent(author)}`;
    const r = await fetch(url, { headers: GH_HEADERS });
    if (!r.ok) break;
    const commits = await r.json();
    if (!Array.isArray(commits) || commits.length === 0) break;
    for (const c of commits) {
      const date = String(c.commit?.author?.date || "").slice(0, 10);
      if (date) byDate.set(date, (byDate.get(date) || 0) + 1);
    }
    if (commits.length < 100) break;
  }
  return byDate; // "yyyy-mm-dd" -> commit count
}

// Accept any shape of Google Sheets link and turn it into its CSV
// export URL; plain CSV links pass through untouched.
export function toCsvUrl(url) {
  let m = url.match(/docs\.google\.com\/spreadsheets\/d\/e\/([\w-]+)/);
  if (m) return `https://docs.google.com/spreadsheets/d/e/${m[1]}/pub?output=csv`;
  m = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv`;
  return url;
}

function normalizeDate(s) {
  if (isValidDateStr(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // dd/mm/yyyy
  if (m) {
    const d = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    if (isValidDateStr(d)) return d;
  }
  return null;
}

export async function fetchSheetRows(url, role) {
  const r = await fetch(toCsvUrl(url), { redirect: "follow" });
  if (!r.ok) {
    const err = new Error("Sheet not reachable — is it shared or published to the web?");
    err.friendly = true;
    throw err;
  }
  const wb = XLSX.read(await r.text(), { type: "string" });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false });

  // headers match metric keys OR labels, case-insensitive
  const keyFor = {};
  for (const m of role.metrics) {
    keyFor[m.key.toLowerCase()] = m.key;
    keyFor[m.label.toLowerCase()] = m.key;
  }
  const byDate = new Map();
  for (const row of rows) {
    let date = null;
    const metrics = {};
    for (const [h, v] of Object.entries(row)) {
      const hl = String(h).trim().toLowerCase();
      if (hl === "date") date = normalizeDate(String(v).trim());
      else if (keyFor[hl]) metrics[keyFor[hl]] = Number(v);
    }
    if (date) byDate.set(date, metrics); // last row wins per date
  }
  return byDate;
}

export function extractChannelId(input) {
  const m = String(input).match(/(UC[\w-]{22})/);
  return m ? m[1] : null;
}

export async function fetchYoutubeUploads(channelId) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    headers: { "User-Agent": "proofly" },
  });
  if (!r.ok) {
    const err = new Error("Channel feed not reachable — check the channel ID");
    err.friendly = true;
    throw err;
  }
  const xml = await r.text();
  const byDate = new Map();
  for (const entry of xml.split("<entry>").slice(1)) {
    const m = entry.match(/<published>(\d{4}-\d{2}-\d{2})/);
    if (m) byDate.set(m[1], (byDate.get(m[1]) || 0) + 1);
  }
  return byDate; // "yyyy-mm-dd" -> uploads
}

// Idempotent: wipe this connection's rows, insert the fresh batch.
export async function syncConnection(conn, user) {
  const role = getRole(user.role);
  let metricsByDate = new Map();

  if (conn.type === "github_repo") {
    const commits = await fetchRepoCommits(conn.config.repo, user.githubUsername);
    for (const [date, n] of commits) metricsByDate.set(date, { commit: n });
  } else if (conn.type === "sheet") {
    metricsByDate = await fetchSheetRows(conn.config.url, role);
  } else if (conn.type === "youtube") {
    const uploads = await fetchYoutubeUploads(conn.config.channelId);
    for (const [date, n] of uploads) metricsByDate.set(date, { video: n });
  }

  const docs = [];
  for (const [date, raw] of metricsByDate) {
    if (!isValidDateStr(date)) continue;
    const clean = sanitizeMetrics(user.role, raw);
    if (!clean) continue;
    docs.push({
      userId: user._id,
      role: user.role,
      date,
      metrics: clean.metrics,
      weightedTotal: clean.weightedTotal,
      note: `Synced from ${conn.label}`,
      verification: "imported",
      source: "connection",
      connectionId: conn._id,
    });
  }

  await Contribution.deleteMany({ connectionId: conn._id });
  if (docs.length) await Contribution.insertMany(docs);
  conn.lastSyncAt = new Date();
  conn.lastSynced = docs.length;
  await conn.save();
  return { synced: docs.length };
}
