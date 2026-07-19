import { getRole } from "../config/roles.js";
import { serverToday } from "./dates.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const VERIFICATION_LABELS = {
  self_reported: "Self-reported",
  evidence: "📎 Evidence-backed",
  imported: "✓ Imported",
};

// Self-contained proof-of-work report: one HTML file the user can
// attach to an application, email to a recruiter, or print to PDF.
// No external assets — it renders identically offline forever.
export function buildProfileHtml({ user, summary, badges, cardSvg, contributions, verificationCounts }) {
  const role = getRole(user.role);
  const metricLabel = {};
  for (const m of role.metrics) metricLabel[m.key] = m.label;

  const verifiedPct = summary.totalContributions
    ? Math.round((summary.verifiedCount / summary.totalContributions) * 100)
    : 0;

  const statBoxes = [
    ["🔥 " + summary.currentStreak, "day streak"],
    [summary.longestStreak, "longest streak"],
    [summary.activeDays, "active days"],
    [summary.score, "score"],
    [summary.totalContributions, "entries logged"],
    [verifiedPct + "%", "verified"],
  ]
    .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`)
    .join("");

  const badgeItems = badges
    .map((b) => `<div class="badge" title="${esc(b.desc)}">${b.icon} ${esc(b.label)}</div>`)
    .join("");

  const metricRows = role.metrics
    .map((m) => `<tr><td>${esc(m.label)}</td><td>${summary.metricTotals[m.key] ?? 0}</td></tr>`)
    .join("");

  const verificationRows = Object.entries(VERIFICATION_LABELS)
    .filter(([k]) => verificationCounts[k])
    .map(([k, label]) => `<tr><td>${label}</td><td>${verificationCounts[k]}</td></tr>`)
    .join("");

  const logRows = contributions
    .map((c) => {
      const metrics = Object.entries(c.metrics)
        .map(([k, v]) => `${metricLabel[k] || k}: ${v}`)
        .join(", ");
      const proof = c.evidenceUrl
        ? `<a href="${esc(c.evidenceUrl)}">view proof</a>`
        : "-";
      return `<tr><td>${c.date}</td><td>${esc(metrics)}</td><td>${VERIFICATION_LABELS[c.verification]}</td><td>${proof}</td><td>${esc(c.note || "")}</td></tr>`;
    })
    .join("\n");

  const liveUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/u/${user.username}`;

  // brand mark: the terracotta broken ring
  const logo = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="#c4633a" stroke-width="5" stroke-dasharray="40 14" stroke-linecap="round" transform="rotate(-45 12 12)"/></svg>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(user.name)} | Proofly proof-of-work</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px 20px; background: #eee9df;
         color: #221c15; font: 14px/1.55 -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
  .sheet { max-width: 780px; margin: 0 auto; background: #ffffff;
           border: 1px solid #e4dccf; border-radius: 18px; padding: 48px 52px;
           box-shadow: 0 24px 60px rgba(34, 24, 12, 0.12); }
  .brand { display: flex; align-items: center; gap: 8px; font-weight: 700;
           font-size: 15px; letter-spacing: -0.01em; }
  .brand small { font-weight: 500; color: #8a7f72; font-size: 11px;
                 text-transform: uppercase; letter-spacing: 0.18em; margin-left: 6px; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           gap: 16px; border-bottom: 2px solid #221c15; padding-bottom: 20px; margin-top: 26px; }
  h1 { margin: 0; font-size: 30px; letter-spacing: -0.02em; }
  .sub { color: #6d6459; margin: 6px 0 0; font-size: 13px; }
  .sub .role { color: ${role.color}; font-weight: 700; }
  .streakbox { text-align: right; flex-shrink: 0; }
  .streakbox b { display: block; font-size: 26px; color: #c4633a; }
  .streakbox span { font-size: 11px; color: #8a7f72; }
  h2 { font-size: 11px; margin: 30px 0 12px; color: #c4633a;
       text-transform: uppercase; letter-spacing: 0.22em; font-weight: 700; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
  .stat { flex: 1 1 100px; background: #faf7f1; border: 1px solid #eee7da;
          border-radius: 12px; padding: 12px; text-align: center; }
  .stat b { display: block; font-size: 20px; letter-spacing: -0.01em; }
  .stat span { font-size: 10.5px; color: #8a7f72; }
  .card { background: #faf7f1; border: 1px solid #eee7da; border-radius: 12px; padding: 14px; }
  .card svg { max-width: 100%; height: auto; display: block; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; }
  .badge { background: #fff; border: 1px solid #e4dccf; border-radius: 999px;
           padding: 6px 13px; font-size: 12.5px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee7da;
           font-size: 13px; vertical-align: top; }
  th { color: #8a7f72; font-weight: 600; font-size: 11px;
       text-transform: uppercase; letter-spacing: 0.08em; }
  tr:last-child td { border-bottom: none; }
  a { color: #c4633a; }
  footer { margin-top: 42px; padding-top: 18px; border-top: 1px solid #eee7da;
           color: #8a7f72; font-size: 11.5px; display: flex; justify-content: space-between;
           gap: 12px; flex-wrap: wrap; align-items: center; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: none; box-shadow: none; border-radius: 0; padding: 24px 8px; max-width: none; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="brand">${logo} Proofly <small>Verified proof-of-work</small></div>

  <header>
    <div>
      <h1>${esc(user.name)}</h1>
      <p class="sub">@${esc(user.username)} · <span class="role">${esc(role.label)}</span>${user.headline ? " · " + esc(user.headline) : ""}</p>
    </div>
    <div class="streakbox"><b>${summary.currentStreak}</b><span>day streak<br>longest ${summary.longestStreak}</span></div>
  </header>

  <div class="stats">${statBoxes}</div>

  <h2>Contribution graph, last 26 weeks</h2>
  <div class="card">${cardSvg}</div>

  ${badges.length ? `<h2>Achievements</h2><div class="badges">${badgeItems}</div>` : ""}

  <h2>Lifetime numbers</h2>
  <table><tr><th>Metric</th><th>Total</th></tr>${metricRows}</table>

  <h2>Verification</h2>
  <table><tr><th>Level</th><th>Entries</th></tr>${verificationRows}</table>

  <h2>Recent work log</h2>
  <table>
    <tr><th>Date</th><th>Work</th><th>Verification</th><th>Proof</th><th>Note</th></tr>
    ${logRows}
  </table>

  <footer>
    <span>Generated by Proofly on ${serverToday()}. Consistency you can't fake.</span>
    <span>Verify live: <a href="${esc(liveUrl)}">${esc(liveUrl)}</a></span>
  </footer>
</div>
</body>
</html>`;
}
