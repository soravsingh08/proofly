// Client dates: LOCAL yyyy-mm-dd strings (the user's wall-clock
// day — edge case B7). Arithmetic via UTC-noon like the server.

export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDays(s, n) {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(s) {
  return new Date(`${s}T12:00:00Z`).getUTCDay(); // 0=Sun
}

export function monthShort(s) {
  return new Date(`${s}T12:00:00Z`).toLocaleString("en", {
    month: "short",
    timeZone: "UTC",
  });
}

export function prettyDate(s) {
  return new Date(`${s}T12:00:00Z`).toLocaleString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Full calendar-year grid (Jan 1 – Dec 31) for the year filter.
// Future days render too — empty squares, waiting to be earned.
export function buildCalendarYearGrid(year) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  let cursor = addDays(start, -dayOfWeek(start)); // snap to Sunday
  const weeks = [];
  const monthLabels = [];
  let lastMonth = "";

  while (cursor <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: cursor,
        inRange: cursor >= start && cursor <= end,
      });
      cursor = addDays(cursor, 1);
    }
    const anchor = week.find((c) => c.date >= start) || week[0];
    const m = monthShort(anchor.date);
    if (m !== lastMonth) {
      monthLabels.push({ col: weeks.length, label: m });
      lastMonth = m;
    }
    weeks.push(week);
  }
  return { weeks, monthLabels };
}

// Build the 53-column GitHub grid ending on today's week (C3).
// Returns { weeks: [[{date, inRange}]], monthLabels: [{col, label}] }
export function buildYearGrid(todayStr) {
  const end = todayStr;
  // walk back to the Sunday of the week 52 weeks ago
  let start = addDays(end, -364);
  start = addDays(start, -dayOfWeek(start)); // snap to Sunday

  const weeks = [];
  let cursor = start;
  let lastMonth = "";
  const monthLabels = [];

  while (cursor <= end && weeks.length < 54) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: cursor, inRange: cursor <= end });
      cursor = addDays(cursor, 1);
    }
    // month label on the column where a new month starts
    const m = monthShort(week[0].date);
    if (m !== lastMonth) {
      monthLabels.push({ col: weeks.length, label: m });
      lastMonth = m;
    }
    weeks.push(week);
    if (week[6].date >= end) break;
  }
  return { weeks, monthLabels };
}
