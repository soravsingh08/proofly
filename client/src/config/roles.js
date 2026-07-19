// Mirror of server/src/config/roles.js (display fields only).
// If you touch one, touch both. FROZEN at H1.
export const ROLES = {
  developer: {
    label: "Software Developer",
    color: "#22c55e",
    icon: "code",
    metrics: [
      { key: "commit", label: "Commits", type: "count" },
      { key: "pull_request", label: "Pull Requests", type: "count" },
      { key: "bug_fixed", label: "Bugs Fixed", type: "count" },
      { key: "feature", label: "Features Shipped", type: "count" },
      { key: "problem_solved", label: "LeetCode Solved", type: "count" },
      { key: "code_review", label: "Code Reviews", type: "count" },
    ],
  },
  digital_marketing: {
    label: "Digital Marketer",
    color: "#f59e0b",
    icon: "trending-up",
    metrics: [
      { key: "seo_task", label: "SEO Tasks", type: "count" },
      { key: "blog", label: "Blogs Published", type: "count" },
      { key: "campaign", label: "Campaigns", type: "count" },
      { key: "social_post", label: "Social Posts", type: "count" },
      { key: "lead", label: "Leads Generated", type: "count" },
      { key: "traffic", label: "Traffic Driven", type: "count" },
    ],
  },
  sales: {
    label: "Sales Executive",
    color: "#ef4444",
    icon: "briefcase",
    metrics: [
      { key: "call", label: "Calls Made", type: "count" },
      { key: "meeting", label: "Meetings", type: "count" },
      { key: "deal", label: "Deals Closed", type: "count" },
      { key: "followup", label: "Follow-ups", type: "count" },
      { key: "demo", label: "Demos Given", type: "count" },
      { key: "revenue", label: "Revenue", type: "currency" },
    ],
  },
  hr: {
    label: "HR / Recruiter",
    color: "#a855f7",
    icon: "users",
    metrics: [
      { key: "candidate", label: "Candidates Sourced", type: "count" },
      { key: "interview", label: "Interviews", type: "count" },
      { key: "hire", label: "Hires", type: "count" },
      { key: "screening", label: "Screenings Done", type: "count" },
      { key: "offer", label: "Offers Made", type: "count" },
    ],
  },
  meta_ads: {
    label: "Meta Ads Specialist",
    color: "#3b82f6",
    icon: "target",
    importable: true,
    metrics: [
      { key: "leads", label: "Leads Generated", type: "count" },
      { key: "campaign", label: "Campaigns Created", type: "count" },
      { key: "creative", label: "Ad Creatives", type: "count" },
      { key: "ab_test", label: "A/B Tests Run", type: "count" },
      { key: "spend", label: "Ad Spend", type: "currency" },
      { key: "roas", label: "ROAS", type: "ratio" },
      { key: "ctr", label: "CTR %", type: "percent" },
    ],
  },
  designer: {
    label: "Designer & Video Editor",
    color: "#ec4899",
    icon: "pen-tool",
    metrics: [
      { key: "design", label: "Designs Delivered", type: "count" },
      { key: "video", label: "Videos Edited", type: "count" },
      { key: "approval", label: "Client Approvals", type: "count" },
      { key: "concept", label: "Concepts Pitched", type: "count" },
      { key: "reel", label: "Reels / Shorts Made", type: "count" },
    ],
  },
};

export const ROLE_KEYS = Object.keys(ROLES);

export function formatMetric(value, type) {
  if (value == null) return "-";
  if (type === "currency")
    return "₹" + Number(value).toLocaleString("en-IN");
  if (type === "percent") return `${value}%`;
  if (type === "ratio") return `${value}x`;
  return Number(value).toLocaleString("en-IN");
}
