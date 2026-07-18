// ============================================================
// AI Career Summary — turns a user's contribution history into
// a recruiter-ready summary via the OpenAI API. This is the
// product's "AI fluency" feature: the model reads PROOF (real
// logged metrics, streaks, patterns), not self-description.
// ============================================================
import { getRole } from "../config/roles.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export function aiAvailable() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildPrompt(user, summary, recent) {
  const role = getRole(user.role);
  const metricLines = role.metrics
    .map((m) => `- ${m.label}: ${summary.metricTotals[m.key] ?? 0}`)
    .join("\n");
  const recentLines = recent
    .slice(0, 15)
    .map((c) => {
      const metrics = Object.entries(c.metrics instanceof Map ? Object.fromEntries(c.metrics) : c.metrics)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      return `${c.date} [${c.verification}] ${metrics}${c.note ? ` — "${c.note}"` : ""}`;
    })
    .join("\n");

  return `You are writing a career summary for a recruiter reviewing a verified proof-of-work profile on Proofly (like a GitHub profile, but for ${role.label}s). The data below is LOGGED WORK, not resume claims — some entries are verified imports from real platform reports.

PROFILE
Name: ${user.name}
Role: ${role.label}
Headline: ${user.headline || "(none)"}

TRACK RECORD
- Active days (logged work): ${summary.activeDays}
- Current daily streak: ${summary.currentStreak} days
- Longest streak: ${summary.longestStreak} days
- Total contributions: ${summary.totalContributions}
Lifetime metrics:
${metricLines}

RECENT ENTRIES (newest first)
${recentLines}

Write JSON with exactly these keys:
- "summary": 3-4 sentences, third person, recruiter-facing. Lead with consistency (streaks/active days) because that is the platform's unfakeable signal, then the strongest metrics. Confident but factual — never invent numbers not present above.
- "highlights": array of exactly 3 short punchy bullet strings (max 10 words each), each anchored to a real number from the data.

Return ONLY the JSON object.`;
}

export async function generateSummary(user, summary, recent) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: buildPrompt(user, summary, recent) }],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("OpenAI error:", res.status, body.slice(0, 300));
    throw new Error(`OpenAI request failed (${res.status})`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    text: String(parsed.summary || "").slice(0, 1200),
    highlights: (Array.isArray(parsed.highlights) ? parsed.highlights : [])
      .slice(0, 3)
      .map((h) => String(h).slice(0, 120)),
  };
}
