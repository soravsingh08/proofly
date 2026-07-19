// ============================================================
// Site assistant — answers "how does this work?" questions for
// the floating helper widget. Works with zero AI config: a
// keyword-matched knowledge base always answers; when an LLM
// key with quota is present it rewrites answers conversationally
// (and falls back to the knowledge base if the call fails).
// ============================================================
import { ROLES } from "../config/roles.js";
import { SITE } from "../config/site.js";
import { aiAvailable, LLM_URL, LLM_MODEL } from "./aiSummary.js";

const roleLabels = Object.values(ROLES).map((r) => r.label).join(", ");

// Each topic: match keywords, a plain answer, and page links the
// widget renders as tap-able chips.
const TOPICS = [
  {
    keywords: ["what", "proofly", "about", "platform", "site", "website", "work", "how"],
    reply:
      `Proofly is like GitHub's contribution graph, but for every profession (${roleLabels}). ` +
      `You log your real work daily, back it with evidence, and your public profile shows a heatmap, streaks and a score recruiters can trust. ${SITE.about.tagline}`,
    links: [{ label: "Leaderboard", to: "/leaderboard" }],
    id: "about",
  },
  {
    keywords: ["start", "started", "begin", "register", "sign", "signup", "account", "join", "new"],
    reply:
      "Getting started takes a minute: create an account, pick your profession, then log your first day of work. Your public profile and heatmap start growing immediately.",
    links: [
      { label: "Create account", to: "/register" },
      { label: "Log in", to: "/login" },
    ],
    id: "start",
  },
  {
    keywords: ["log", "logging", "activity", "entry", "add", "record", "daily", "today"],
    reply:
      "Go to Log Activity, pick the date, enter the metrics for your role (e.g. commits, campaigns, deals), optionally add a note and an evidence link (PR, live campaign, report). Each logged day lights up your heatmap.",
    links: [{ label: "Log Activity", to: "/log" }],
    id: "log",
  },
  {
    keywords: ["role", "roles", "profession", "developer", "marketer", "sales", "designer", "hr", "choose"],
    reply:
      `Proofly currently supports: ${roleLabels}. Each role has its own metrics and weights. You pick one when you join, and your dashboard, heatmap and score are built from it.`,
    links: [{ label: "Choose role", to: "/choose-role" }],
    id: "roles",
  },
  {
    keywords: ["verify", "verification", "evidence", "proof", "trust", "fake", "real", "badge"],
    reply:
      "Every entry has a verification level: self-reported (no proof), evidence (you attached a link), or imported/synced (pulled straight from a platform like Meta Ads or GitHub, so it can't be faked). Higher rungs earn more recruiter trust badges on your profile.",
    links: [],
    id: "verification",
  },
  {
    keywords: ["streak", "streaks", "freeze", "freezes", "consistency", "miss", "missed", "gap"],
    reply:
      "A streak is consecutive days with logged work. It's the platform's core signal because you can't fake showing up every day. Streak freezes can bridge an occasional missed day so one gap doesn't erase months of consistency.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "streaks",
  },
  {
    keywords: ["score", "points", "rank", "ranking", "leaderboard", "calculated", "weight", "top"],
    reply:
      "Your score comes from weighted metrics (each role weights what matters, e.g. features count more than commits), active days and your streak. The leaderboard ranks everyone by it; consistency beats one-day spikes.",
    links: [{ label: "Leaderboard", to: "/leaderboard" }],
    id: "score",
  },
  {
    keywords: ["heatmap", "graph", "green", "squares", "grid", "calendar", "contribution"],
    reply:
      "The heatmap is your year at a glance: one cell per day, tinted by how much weighted work you logged. It's the same idea as GitHub's contribution graph, for your profession.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "heatmap",
  },
  {
    keywords: ["import", "excel", "upload", "meta", "facebook", "ads", "sync", "api", "connect", "github", "integration"],
    reply:
      "You can import instead of typing: Meta Ads specialists can upload Excel exports or connect their ad account for verified syncs, and developers can link GitHub so commits sync automatically. Imported entries get the highest verification badge.",
    links: [{ label: "Import Meta Ads", to: "/import" }],
    id: "import",
  },
  {
    keywords: ["resume", "cv", "export", "pdf", "print", "summary", "ai", "recruiter", "share", "profile", "public", "link"],
    reply:
      "Your profile is public at /u/your-username, share it like a GitHub link. From there recruiters can open a printable résumé view, and you can generate an AI career summary built from your logged proof, not self-description.",
    links: [{ label: "Leaderboard (find profiles)", to: "/leaderboard" }],
    id: "profile",
  },
  {
    keywords: ["goal", "goals", "target", "reminder", "email"],
    reply:
      "You can set goals (daily or weekly targets for your metrics) and Proofly tracks them from your logged work. Email reminders help protect your streak.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "goals",
  },
  {
    keywords: ["help", "support", "bug", "problem", "contact", "team", "who", "made", "built", "founder"],
    reply:
      `Proofly is built by ${SITE.team.map((t) => t.name).join(" and ")}. Something broken or confusing? Use the support option in your account to reach us. Topics: ${SITE.supportTopics.join(", ")}.`,
    links: [],
    id: "support",
  },
];

const FALLBACK_REPLY =
  "I can help you get around Proofly! Ask me things like: how does Proofly work, how is my score calculated, how do streaks work, how to verify my work, how to import Meta Ads data, or how to share my profile with recruiters.";

// tiny stemmer-free scorer: count keyword hits, longest keyword wins ties
function matchTopic(message) {
  const text = message.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (text.includes(kw)) score += kw.length > 4 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  // require at least one meaningful hit
  return bestScore >= 2 ? best : null;
}

function knowledgeDigest() {
  return TOPICS.map((t) => `- [${t.id}] ${t.reply}`).join("\n");
}

async function llmAnswer(message, history) {
  const messages = [
    {
      role: "system",
      content:
        `You are the friendly in-app helper for Proofly (${SITE.about.title}). ` +
        `Answer ONLY from the site knowledge below in 1-3 short sentences, conversational, no markdown. ` +
        `If the question is unrelated to Proofly, politely steer back to the site.\n\nSITE KNOWLEDGE\n${knowledgeDigest()}\n\nPAGES: /register, /login, /choose-role, /dashboard, /log, /import, /leaderboard, /u/<username>, /u/<username>/resume`,
    },
    ...history.slice(-6).map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: String(m.text || "").slice(0, 500),
    })),
    { role: "user", content: message },
  ];

  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: LLM_MODEL, messages, temperature: 0.4, max_tokens: 220 }),
  });
  if (!res.ok) throw new Error(`assistant LLM failed (${res.status})`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// after a hard LLM failure (quota/auth), don't retry every message —
// answer instantly from the knowledge base for a while instead
let llmDownUntil = 0;

export async function answerQuestion(message, history = []) {
  const topic = matchTopic(message);

  if (aiAvailable() && Date.now() > llmDownUntil) {
    try {
      const reply = await llmAnswer(message, history);
      return { reply, links: topic?.links || [] };
    } catch (err) {
      console.error("assistant:", err.message); // fall through to knowledge base
      llmDownUntil = Date.now() + 10 * 60 * 1000;
    }
  }

  if (topic) return { reply: topic.reply, links: topic.links };
  return { reply: FALLBACK_REPLY, links: [{ label: "Leaderboard", to: "/leaderboard" }] };
}
