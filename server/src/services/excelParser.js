import * as XLSX from "xlsx";
import { isValidDateStr, fromUtc } from "./dates.js";
import { sanitizeMetrics } from "../config/roles.js";

// Template columns for the Meta Ads import — the parser and the
// downloadable template are generated from the SAME list (G2).
export const META_ADS_COLUMNS = [
  { header: "Date", key: "date" },
  { header: "Leads Generated", key: "leads" },
  { header: "Campaigns Created", key: "campaign" },
  { header: "Ad Spend", key: "spend" },
  { header: "ROAS", key: "roas" },
  { header: "CTR %", key: "ctr" },
];

export function buildTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    META_ADS_COLUMNS.map((c) => c.header),
    ["2026-07-01", 12, 1, 4500, 3.2, 1.8], // example row
  ]);
  ws["!cols"] = META_ADS_COLUMNS.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Meta Ads Report");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// Normalize whatever lands in the Date column: Date object
// (cellDates), string "2026-07-01" / "01/07/2026", or a raw
// Excel serial number that slipped through. (G4 — the #1 gotcha)
function normalizeDate(v) {
  if (v instanceof Date && !isNaN(v))
    // xlsx parses serials in local-agnostic fashion; take the
    // date parts directly to avoid off-by-one from tz shifts
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(
      v.getDate()
    ).padStart(2, "0")}`;
  if (typeof v === "number" && v > 20000 && v < 60000) {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (isValidDateStr(s)) return s;
    // try dd/mm/yyyy or mm/dd/yyyy — accept only unambiguous day>12 forms as dd/mm
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      let [, a, b, y] = m;
      a = Number(a); b = Number(b);
      const [day, month] = a > 12 ? [a, b] : [b, a]; // default mm/dd, flip if impossible
      const candidate = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (isValidDateStr(candidate)) return candidate;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed)) return fromUtc(parsed);
  }
  return null;
}

// Parse an uploaded Meta Ads xlsx buffer.
// Returns { rows: [{date, metrics, weightedTotal}], skipped, errors }
// Skips garbage rows instead of failing the whole file (G3).
export function parseMetaAdsXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets");
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
  if (raw.length === 0) throw new Error("Sheet is empty");

  // header validation (G2): every expected header must exist
  const presentHeaders = Object.keys(raw[0]);
  const missing = META_ADS_COLUMNS.filter(
    (c) => !presentHeaders.some((h) => h.trim().toLowerCase() === c.header.toLowerCase())
  ).map((c) => c.header);
  if (missing.length > 0) {
    const err = new Error(`Missing columns: ${missing.join(", ")}. Use the template.`);
    err.friendly = true;
    throw err;
  }

  // map actual header spelling -> our key (tolerate case/space drift)
  const headerFor = {};
  for (const c of META_ADS_COLUMNS)
    headerFor[c.key] = presentHeaders.find(
      (h) => h.trim().toLowerCase() === c.header.toLowerCase()
    );

  const byDate = new Map(); // merge duplicate dates in-file
  let skipped = 0;

  for (const row of raw) {
    const date = normalizeDate(row[headerFor.date]);
    if (!date) { skipped++; continue; }

    const rawMetrics = {};
    for (const c of META_ADS_COLUMNS) {
      if (c.key === "date") continue;
      rawMetrics[c.key] = row[headerFor[c.key]];
    }
    const clean = sanitizeMetrics("meta_ads", rawMetrics);
    if (!clean) { skipped++; continue; }

    if (byDate.has(date)) {
      // merge duplicate date rows by summing counts, keeping latest ratios
      const prev = byDate.get(date);
      for (const [k, v] of Object.entries(clean.metrics)) {
        if (k === "roas" || k === "ctr") prev.metrics[k] = v;
        else prev.metrics[k] = (prev.metrics[k] || 0) + v;
      }
      prev.weightedTotal += clean.weightedTotal;
    } else {
      byDate.set(date, { date, ...clean });
    }
  }

  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (rows.length === 0) {
    const err = new Error("No valid rows found. Check dates and numbers, or use the template.");
    err.friendly = true;
    throw err;
  }
  return { rows, skipped };
}

// Aggregate preview numbers for the confirm screen
export function previewStats(rows) {
  const sum = (k) => rows.reduce((acc, r) => acc + (r.metrics[k] || 0), 0);
  const avg = (k) => {
    const vals = rows.map((r) => r.metrics[k]).filter((v) => v > 0);
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : 0;
  };
  return {
    days: rows.length,
    from: rows[0].date,
    to: rows[rows.length - 1].date,
    totalLeads: sum("leads"),
    totalCampaigns: sum("campaign"),
    totalSpend: sum("spend"),
    avgRoas: avg("roas"),
    avgCtr: avg("ctr"),
  };
}
