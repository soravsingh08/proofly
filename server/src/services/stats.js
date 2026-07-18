import Contribution from "../models/Contribution.js";
import { getRole } from "../config/roles.js";
import { addDays, serverToday } from "./dates.js";

// ---- aggregation: daily weighted totals for a user ----
export async function dailyTotals(userId) {
  const rows = await Contribution.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: "$date",
        total: { $sum: "$weightedTotal" },
      },
    },
  ]);
  // Map: "yyyy-mm-dd" -> weighted total
  const map = new Map();
  for (const r of rows) map.set(r._id, r.total);
  return map;
}

// Same thing for many users in ONE query — leaderboard/search
// would otherwise fire an aggregation per user.
export async function totalsByUser(userIds) {
  const rows = await Contribution.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $group: {
        _id: { u: "$userId", d: "$date" },
        total: { $sum: "$weightedTotal" },
      },
    },
  ]);
  const byUser = new Map();
  for (const r of rows) {
    const key = String(r._id.u);
    if (!byUser.has(key)) byUser.set(key, new Map());
    byUser.get(key).set(r._id.d, r.total);
  }
  return byUser;
}

// ---- heatmap: percentile-based levels (edge case C2) ----
// level 0: none, 1: >0, 2: >=p50, 3: >=p75, 4: >=p90 of the
// user's own nonzero days — every active user gets a rich graph.
export function computeLevels(totalsMap) {
  const values = [...totalsMap.values()].filter((v) => v > 0).sort((a, b) => a - b);
  if (values.length === 0) return () => 0;
  const pick = (p) => values[Math.min(values.length - 1, Math.floor(p * values.length))];
  const p50 = pick(0.5), p75 = pick(0.75), p90 = pick(0.9);
  return (v) => {
    if (!v || v <= 0) return 0;
    if (v >= p90) return 4;
    if (v >= p75) return 3;
    if (v >= p50) return 2;
    return 1;
  };
}

export function heatmapPayload(totalsMap) {
  const level = computeLevels(totalsMap);
  return [...totalsMap.entries()].map(([date, total]) => ({
    date,
    total,
    level: level(total),
  }));
}

// ---- streaks (edge case D1) ----
// Current streak: consecutive days ending today OR yesterday
// (yesterday keeps it alive if they haven't logged yet today).
// Streak-freeze days bridge gaps but add no activity.
export function computeStreaks(totalsMap, freezes = []) {
  const daySet = new Set(totalsMap.keys());
  for (const f of freezes) daySet.add(f);
  const days = [...daySet].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === addDays(days[i - 1], 1) ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = serverToday();
  const yesterday = addDays(today, -1);
  let anchor = null;
  if (daySet.has(today)) anchor = today;
  else if (daySet.has(yesterday)) anchor = yesterday;

  let current = 0;
  while (anchor && daySet.has(anchor)) {
    current++;
    anchor = addDays(anchor, -1);
  }
  return { current, longest };
}

// ---- score (edge case D3): consistency-first, capped ----
// Tuned so a year of daily activity lands ~700-850, not insta-999:
// consistency dominates (activeDays + streak), volume is sqrt-damped.
export function computeScore({ activeDays, weightedSum, currentStreak }) {
  const volumeFactor = Math.round(Math.sqrt(weightedSum));
  return Math.min(999, Math.round(activeDays * 1.5 + currentStreak * 2 + volumeFactor));
}

// ---- full summary for dashboard + public profile ----
// pass precomputed totals to avoid a duplicate aggregation
export async function summaryFor(user, totals) {
  totals = totals || (await dailyTotals(user._id));
  const streaks = computeStreaks(totals, user.streakFreezes);
  const activeDays = totals.size;
  let weightedSum = 0;
  for (const v of totals.values()) weightedSum += v;

  // per-metric lifetime totals
  const role = getRole(user.role);
  const [metricAgg, totalContributions, verifiedCount] = await Promise.all([
    Contribution.aggregate([
      { $match: { userId: user._id } },
      { $project: { metrics: { $objectToArray: "$metrics" } } },
      { $unwind: "$metrics" },
      {
        $group: {
          _id: "$metrics.k",
          total: { $sum: "$metrics.v" },
          count: { $sum: 1 },
        },
      },
    ]),
    Contribution.countDocuments({ userId: user._id }),
    Contribution.countDocuments({
      userId: user._id,
      verification: { $ne: "self_reported" },
    }),
  ]);
  // counts/currency accumulate; ratios & percents AVERAGE — a
  // lifetime "254x ROAS" sum would be nonsense
  const typeOf = {};
  for (const m of role?.metrics || []) typeOf[m.key] = m.type;
  const metricTotals = {};
  for (const m of role?.metrics || []) metricTotals[m.key] = 0;
  for (const r of metricAgg) {
    if (!(r._id in metricTotals)) continue;
    const isAvg = typeOf[r._id] === "ratio" || typeOf[r._id] === "percent";
    metricTotals[r._id] = isAvg ? +(r.total / r.count).toFixed(1) : r.total;
  }

  return {
    activeDays,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    score: computeScore({ activeDays, weightedSum, currentStreak: streaks.current }),
    metricTotals,
    totalContributions,
    verifiedCount,
  };
}
