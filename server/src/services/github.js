import Contribution from "../models/Contribution.js";
import { sanitizeMetrics } from "../config/roles.js";
import { isValidDateStr } from "./dates.js";

// Verification rung 3: pull real activity straight from GitHub's
// public events API. No auth needed; the feed covers ~90 days,
// unauthenticated limit is 60 req/hr per IP — plenty for a demo.
const HEADERS = { "User-Agent": "proofly", Accept: "application/vnd.github+json" };

export async function githubUserExists(username) {
  const r = await fetch(`https://api.github.com/users/${username}`, { headers: HEADERS });
  return r.ok;
}

async function fetchDailyActivity(username) {
  const byDate = new Map(); // "yyyy-mm-dd" -> { commit, pull_request }
  for (let page = 1; page <= 3; page++) {
    const r = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=100&page=${page}`,
      { headers: HEADERS }
    );
    if (!r.ok) break;
    const events = await r.json();
    if (!Array.isArray(events) || events.length === 0) break;
    for (const ev of events) {
      const date = String(ev.created_at || "").slice(0, 10);
      let day = byDate.get(date);
      if (!day) byDate.set(date, (day = { commit: 0, pull_request: 0 }));
      if (ev.type === "PushEvent")
        day.commit += ev.payload?.distinct_size ?? ev.payload?.size ?? 0;
      if (ev.type === "PullRequestEvent" && ev.payload?.action === "opened")
        day.pull_request += 1;
    }
    if (events.length < 100) break;
  }
  return byDate;
}

// Idempotent, same pattern as the excel import (G5): wipe previous
// github_sync rows, insert the fresh batch as verified.
export async function syncGithubUser(user) {
  const byDate = await fetchDailyActivity(user.githubUsername);
  const docs = [];
  for (const [date, counts] of byDate) {
    if (!isValidDateStr(date)) continue;
    const clean = sanitizeMetrics("developer", counts);
    if (!clean) continue;
    docs.push({
      userId: user._id,
      role: "developer",
      date,
      metrics: clean.metrics,
      weightedTotal: clean.weightedTotal,
      note: `Synced from github.com/${user.githubUsername}`,
      verification: "imported",
      source: "github_sync",
    });
  }
  await Contribution.deleteMany({ userId: user._id, source: "github_sync" });
  if (docs.length) await Contribution.insertMany(docs);
  return { synced: docs.length };
}
