import { getRole } from "../config/roles.js";
import { addDays, diffDays, serverToday, toUtcNoon } from "./dates.js";
import { computeLevels } from "./stats.js";

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

// GitHub-style embed card: 26-week heatmap + streak + score.
// Pure string building, no deps — renders identically everywhere.
export function buildProfileCard({ user, totals, streaks, score }) {
  const role = getRole(user.role);
  const level = computeLevels(totals);
  const today = serverToday();

  const CELL = 10, GAP = 3, STEP = CELL + GAP;
  // last 26 weeks, columns aligned to Sunday like GitHub
  let start = addDays(today, -(26 * 7 - 1));
  start = addDays(start, -toUtcNoon(start).getUTCDay());

  let cells = "";
  for (let d = start; diffDays(d, today) <= 0; d = addDays(d, 1)) {
    const week = Math.floor(diffDays(d, start) / 7);
    const dow = toUtcNoon(d).getUTCDay();
    const lv = level(totals.get(d) || 0);
    const fill = lv === 0
      ? 'fill="#161b22"'
      : `fill="${role.color}" fill-opacity="${[0, 0.25, 0.5, 0.75, 1][lv]}"`;
    cells += `<rect x="${week * STEP}" y="${dow * STEP}" width="${CELL}" height="${CELL}" rx="2" ${fill}/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="196" viewBox="0 0 640 196" font-family="-apple-system,'Segoe UI',Ubuntu,sans-serif">
<rect x="0.5" y="0.5" width="639" height="195" rx="12" fill="#0d1117" stroke="#30363d"/>
<text x="24" y="38" font-size="17" font-weight="700" fill="#e6edf3">${esc(user.name)}</text>
<text x="24" y="58" font-size="12" fill="#8b949e">@${esc(user.username)} · <tspan fill="${role.color}">${esc(role.label)}</tspan></text>
<text x="616" y="38" text-anchor="end" font-size="12" fill="#8b949e">✅ proofly</text>
<g transform="translate(24,76)">${cells}</g>
<g transform="translate(412,96)">
<text font-size="28" font-weight="700" fill="#f0883e">🔥 ${streaks.current}</text>
<text y="20" font-size="11" fill="#8b949e">day streak</text>
<text y="48" font-size="12" fill="#e6edf3">Longest ${streaks.longest} · ${totals.size} active days</text>
<text y="72" font-size="12" fill="#e6edf3">Score <tspan font-weight="700">${score}</tspan></text>
</g>
</svg>`;
}
