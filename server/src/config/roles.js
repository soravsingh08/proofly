// ============================================================
// PROOFLY ROLE CONFIG — single source of truth (FROZEN at H1)
// Everything generates from this: forms, dashboards, heatmap
// intensity, scores, leaderboards. Adding a profession = adding
// an entry here. Zero code changes.
//
// metric.type:  count | currency | ratio | percent
// metric.weight: contribution to heatmap intensity + score.
//                weight 0 = display-only stat (never counts
//                toward "productivity" — e.g. ad spend, ROAS).
// ============================================================

export const ROLES = {
  developer: {
    label: "Software Developer",
    color: "#22c55e",
    icon: "code",
    metrics: [
      { key: "commit", label: "Commits", type: "count", weight: 1 },
      { key: "pull_request", label: "Pull Requests", type: "count", weight: 3 },
      { key: "bug_fixed", label: "Bugs Fixed", type: "count", weight: 2 },
      { key: "feature", label: "Features Shipped", type: "count", weight: 5 },
    ],
  },

  digital_marketing: {
    label: "Digital Marketer",
    color: "#f59e0b",
    icon: "trending-up",
    metrics: [
      { key: "seo_task", label: "SEO Tasks", type: "count", weight: 1 },
      { key: "blog", label: "Blogs Published", type: "count", weight: 4 },
      { key: "campaign", label: "Campaigns", type: "count", weight: 3 },
      { key: "traffic", label: "Traffic Driven", type: "count", weight: 0 },
    ],
  },

  sales: {
    label: "Sales Executive",
    color: "#ef4444",
    icon: "briefcase",
    metrics: [
      { key: "call", label: "Calls Made", type: "count", weight: 1 },
      { key: "meeting", label: "Meetings", type: "count", weight: 2 },
      { key: "deal", label: "Deals Closed", type: "count", weight: 6 },
      { key: "revenue", label: "Revenue", type: "currency", weight: 0 },
    ],
  },

  hr: {
    label: "HR / Recruiter",
    color: "#a855f7",
    icon: "users",
    metrics: [
      { key: "candidate", label: "Candidates Sourced", type: "count", weight: 1 },
      { key: "interview", label: "Interviews", type: "count", weight: 2 },
      { key: "hire", label: "Hires", type: "count", weight: 6 },
    ],
  },

  meta_ads: {
    label: "Meta Ads Specialist",
    color: "#3b82f6",
    icon: "target",
    importable: true, // enables Excel import flow
    metrics: [
      { key: "leads", label: "Leads Generated", type: "count", weight: 2 },
      { key: "campaign", label: "Campaigns Created", type: "count", weight: 4 },
      { key: "spend", label: "Ad Spend", type: "currency", weight: 0 },
      { key: "roas", label: "ROAS", type: "ratio", weight: 0 },
      { key: "ctr", label: "CTR %", type: "percent", weight: 0 },
    ],
  },

  designer: {
    label: "Designer & Video Editor",
    color: "#ec4899",
    icon: "pen-tool",
    metrics: [
      { key: "design", label: "Designs Delivered", type: "count", weight: 2 },
      { key: "video", label: "Videos Edited", type: "count", weight: 3 },
      { key: "approval", label: "Client Approvals", type: "count", weight: 4 },
    ],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);

export function getRole(roleKey) {
  return ROLES[roleKey] || null;
}

// Whitelist + sanitize a raw metrics object for a role. (Edge case B2)
// Returns { metrics, weightedTotal } or null if nothing valid/nonzero. (B1, B3)
export function sanitizeMetrics(roleKey, raw) {
  const role = getRole(roleKey);
  if (!role || !raw || typeof raw !== "object") return null;

  const metrics = {};
  let weightedTotal = 0;
  let hasValue = false;

  for (const m of role.metrics) {
    let v = Number(raw[m.key]);
    if (!Number.isFinite(v) || v <= 0) continue;
    v = Math.min(v, 1_000_000); // clamp absurd values (B1)
    // counts must be integers; currency/ratio/percent allow decimals
    if (m.type === "count") v = Math.round(v);
    metrics[m.key] = v;
    weightedTotal += v * m.weight;
    hasValue = true;
  }

  if (!hasValue) return null; // all-zero submission (B3)
  return { metrics, weightedTotal };
}
