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
    keywords: ["proofly", "about", "platform", "site", "website"],
    reply:
      "Think GitHub's contribution graph, but for every profession. Log real work daily and your public profile shows the streaks and proof recruiters can trust.",
    links: [{ label: "Leaderboard", to: "/leaderboard" }],
    id: "about",
  },
  {
    keywords: ["start", "started", "begin", "register", "sign", "signup", "account", "join", "new"],
    reply:
      "Super quick: create an account, pick your profession, log your first day. Your graph starts growing right away.",
    links: [
      { label: "Create account", to: "/register" },
      { label: "Log in", to: "/login" },
    ],
    id: "start",
  },
  {
    keywords: ["log", "logging", "activity", "entry", "add", "record", "daily", "today"],
    reply:
      "Head to Log Activity, enter today's numbers, and attach a proof link if you have one. Takes about 30 seconds.",
    links: [{ label: "Log Activity", to: "/log" }],
    id: "log",
  },
  {
    keywords: ["role", "roles", "profession", "developer", "marketer", "sales", "designer", "hr", "choose"],
    reply:
      `We support: ${roleLabels}. Each role gets its own metrics and its own graph color.`,
    links: [{ label: "Choose role", to: "/choose-role" }],
    id: "roles",
  },
  {
    keywords: ["verify", "verification", "evidence", "proof", "trust", "fake", "real", "badge"],
    reply:
      "Three trust levels: self-reported, evidence (you attached a link), and verified (synced straight from GitHub or Meta Ads). More proof, more recruiter trust.",
    links: [],
    id: "verification",
  },
  {
    keywords: ["streak", "streaks", "freeze", "freezes", "consistency", "miss", "missed", "gap"],
    reply:
      "Log work on back-to-back days and your streak grows. Miss a day and it resets, though a freeze can save the occasional gap.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "streaks",
  },
  {
    keywords: ["score", "points", "rank", "ranking", "leaderboard", "calculated", "weight", "top"],
    reply:
      "Score = your metrics + active days + streak. Consistency beats one big day, and the leaderboard ranks by it.",
    links: [{ label: "Leaderboard", to: "/leaderboard" }],
    id: "score",
  },
  {
    keywords: ["heatmap", "graph", "green", "squares", "grid", "calendar", "contribution"],
    reply:
      "One square per day, brighter means more work logged. Your whole year at a glance.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "heatmap",
  },
  {
    keywords: ["import", "excel", "upload", "meta", "facebook", "ads", "sync", "api", "connect", "github", "integration", "youtube", "sheet"],
    reply:
      "Skip the typing: connect GitHub, Meta Ads, YouTube or a Google Sheet and your work syncs daily as verified entries.",
    links: [{ label: "Import Meta Ads", to: "/import" }],
    id: "import",
  },
  {
    keywords: ["resume", "cv", "export", "pdf", "print", "summary", "ai", "recruiter", "share", "profile", "public", "link"],
    reply:
      "Your profile lives at proofly.app/u/your-username. Share it anywhere, and grab the printable résumé from there too.",
    links: [{ label: "Leaderboard (find profiles)", to: "/leaderboard" }],
    id: "profile",
  },
  {
    keywords: ["goal", "goals", "target", "reminder", "email"],
    reply:
      "Set weekly targets on your dashboard and watch the bars fill as you log. Little wins, every week.",
    links: [{ label: "Dashboard", to: "/dashboard" }],
    id: "goals",
  },
  {
    keywords: ["help", "support", "bug", "problem", "contact", "team", "who", "made", "built", "founder"],
    reply:
      `Proofly is built by ${SITE.team.map((t) => t.name).join(" and ")}. Something broken? Use the support option in your account and we'll take a look.`,
    links: [],
    id: "support",
  },
];

const FALLBACK_REPLY =
  "Hmm, not sure I got that! Try asking about streaks, scoring, verification, connecting your tools, or sharing your profile.";

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
        `Answer ONLY from the site knowledge below in 1-2 short, warm, conversational sentences, no markdown. ` +
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
