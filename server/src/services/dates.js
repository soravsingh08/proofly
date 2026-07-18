// ============================================================
// Date utilities. THE RULE (edge cases B7, C4):
// dates are yyyy-mm-dd STRINGS everywhere. We never store Date
// objects for contribution days and never parse "yyyy-mm-dd"
// with `new Date(str)` bare (UTC-midnight shift bug). All
// arithmetic goes through UTC-noon to dodge DST/offset issues.
// ============================================================

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = toUtcNoon(s);
  return !isNaN(d.getTime()) && fromUtc(d) === s;
}

// "2026-07-18" -> Date at 2026-07-18T12:00:00Z (safe zone)
export function toUtcNoon(s) {
  return new Date(`${s}T12:00:00Z`);
}

// Date -> "yyyy-mm-dd" using UTC fields
export function fromUtc(d) {
  return d.toISOString().slice(0, 10);
}

export function addDays(s, n) {
  const d = toUtcNoon(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

export function diffDays(a, b) {
  return Math.round((toUtcNoon(a) - toUtcNoon(b)) / 86400000);
}

// Monday of the week containing s — weekly goals reset here
export function startOfWeek(s) {
  const d = toUtcNoon(s);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return fromUtc(d);
}

// Server's notion of "today" — ONLY used for the future-date guard
// with a grace window, never for display. (B6, B7)
export function serverToday() {
  return fromUtc(new Date());
}

// Reject dates beyond tomorrow (26h grace covers every timezone),
// and backfill older than `maxBack` days.
export function isAllowedLogDate(s, maxBack = 30) {
  if (!isValidDateStr(s)) return false;
  const today = serverToday();
  const diff = diffDays(s, today); // positive = future
  return diff <= 1 && diff >= -maxBack;
}
