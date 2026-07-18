// ============================================================
// SEED — the demo's secret weapon. 8 users, 6 roles, months of
// realistic patterned history: weekday-heavy, streaks, vacation
// gaps, one 100+ day streak hero, meta_ads user with "imported"
// verified entries. Deterministic RNG so every run looks the same.
// Run: npm run seed
// ============================================================
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import { ROLES, sanitizeMetrics } from "../config/roles.js";
import { addDays, serverToday } from "../services/dates.js";

// deterministic RNG (mulberry32) — same demo data every run
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PASSWORD = "demo1234"; // every demo account (H6)

const PEOPLE = [
  {
    name: "Arjun Mehta", username: "arjun", role: "developer",
    headline: "Full-stack developer · 2 years of daily shipping",
    months: 12, intensity: 0.85, streakHero: true, // the 100+ day streak profile
  },
  {
    name: "Priya Sharma", username: "priya", role: "sales",
    headline: "B2B SaaS sales · consistency closes deals",
    months: 10, intensity: 0.75,
  },
  {
    name: "Rahul Verma", username: "rahul", role: "meta_ads",
    headline: "Meta Ads specialist · ₹40L+ managed spend",
    months: 8, intensity: 0.7, imported: true, // Excel-verified history
  },
  {
    name: "Sneha Kapoor", username: "sneha", role: "hr",
    headline: "Tech recruiter · 200+ interviews conducted",
    months: 9, intensity: 0.65,
  },
  {
    name: "Vikram Singh", username: "vikram", role: "designer",
    headline: "Brand designer & video editor",
    months: 7, intensity: 0.6,
  },
  {
    name: "Ananya Rao", username: "ananya", role: "digital_marketing",
    headline: "SEO & content marketing · organic growth nerd",
    months: 11, intensity: 0.7,
  },
  {
    name: "Karan Malhotra", username: "karan", role: "sales",
    headline: "Enterprise AE · pipeline is everything",
    months: 6, intensity: 0.55,
  },
  {
    name: "Divya Nair", username: "divya", role: "developer",
    headline: "Frontend engineer · React & design systems",
    months: 5, intensity: 0.5,
  },
];

// generate a plausible metrics object for a role-day
function genMetrics(roleKey, rand, hot) {
  const boost = hot ? 2 : 1;
  const maybe = (p, gen) => (rand() < p ? gen() : 0);
  const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  switch (roleKey) {
    case "developer":
      return {
        commit: int(1, 8) * boost,
        pull_request: maybe(0.5, () => int(1, 3)),
        bug_fixed: maybe(0.4, () => int(1, 4)),
        feature: maybe(0.15, () => 1),
      };
    case "sales":
      return {
        call: int(5, 25),
        meeting: maybe(0.6, () => int(1, 4)),
        deal: maybe(hot ? 0.4 : 0.15, () => int(1, 2)),
        revenue: maybe(hot ? 0.4 : 0.15, () => int(2, 15) * 1000),
      };
    case "meta_ads":
      return {
        leads: int(4, 30) * boost,
        campaign: maybe(0.2, () => 1),
        spend: int(2, 8) * 500,
        roas: +(1.5 + rand() * 3).toFixed(1),
        ctr: +(0.8 + rand() * 2.2).toFixed(1),
      };
    case "hr":
      return {
        candidate: int(2, 10),
        interview: maybe(0.7, () => int(1, 5)),
        hire: maybe(0.1, () => 1),
      };
    case "designer":
      return {
        design: maybe(0.8, () => int(1, 4)),
        video: maybe(0.4, () => int(1, 2)),
        approval: maybe(0.3, () => int(1, 3)),
      };
    case "digital_marketing":
      return {
        seo_task: int(1, 6),
        blog: maybe(0.25, () => 1),
        campaign: maybe(0.2, () => 1),
        traffic: int(50, 800),
      };
    default:
      return {};
  }
}

const NOTES = {
  developer: ["Shipped auth refactor", "Fixed prod memory leak", "Code review day", "Feature flag rollout", ""],
  sales: ["Demo went great", "Closed Q3 renewal", "Cold outreach sprint", "Pipeline review", ""],
  meta_ads: ["Scaled winning ad set", "New creative test", "Launched retargeting campaign", "Optimized CBO budgets", ""],
  hr: ["Final rounds all day", "Sourcing sprint", "Offer accepted!", "Campus drive", ""],
  designer: ["Client brand kit delivered", "Reel edits shipped", "Logo revisions approved", "Motion graphics day", ""],
  digital_marketing: ["Blog hit page 1", "Technical SEO audit", "Newsletter sent", "Backlink outreach", ""],
};

function isWeekend(dateStr) {
  return [0, 6].includes(new Date(`${dateStr}T12:00:00Z`).getUTCDay());
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Wiping proofly collections…");
  await Promise.all([User.deleteMany({}), Contribution.deleteMany({})]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const today = serverToday();

  for (let p = 0; p < PEOPLE.length; p++) {
    const person = PEOPLE[p];
    const rand = rng(1000 + p * 77);
    const user = await User.create({
      name: person.name,
      email: `${person.username}@proofly.demo`,
      username: person.username,
      passwordHash,
      role: person.role,
      headline: person.headline,
    });

    const totalDays = person.months * 30;
    const docs = [];
    // one 10-14 day vacation gap somewhere in the middle
    const vacStart = Math.floor(totalDays * (0.35 + rand() * 0.25));
    const vacLen = 10 + Math.floor(rand() * 5);
    // streak hero: last 130 days are ALL active
    const streakFrom = person.streakHero ? 130 : 0;

    for (let i = totalDays; i >= 0; i--) {
      const date = addDays(today, -i);
      const inVacation = i <= totalDays - vacStart && i > totalDays - vacStart - vacLen;
      const inStreak = person.streakHero && i <= streakFrom;

      if (!inStreak) {
        if (inVacation) continue;
        const p_active = isWeekend(date)
          ? person.intensity * 0.25
          : person.intensity;
        if (rand() > p_active) continue;
      }

      const hot = rand() < 0.12; // occasional big days
      const raw = genMetrics(person.role, rand, hot);
      const clean = sanitizeMetrics(person.role, raw);
      if (!clean) continue;

      const notes = NOTES[person.role];
      const imported =
        person.imported && i > 30 && i <= 120; // 90-day imported block
      docs.push({
        userId: user._id,
        role: person.role,
        date,
        metrics: clean.metrics,
        weightedTotal: clean.weightedTotal,
        note: imported
          ? "Imported from Meta Ads report"
          : notes[Math.floor(rand() * notes.length)],
        verification: imported ? "imported" : "self_reported",
        source: imported ? "excel_import" : "seed",
      });
    }

    await Contribution.insertMany(docs);
    console.log(
      `  ${person.username.padEnd(8)} ${person.role.padEnd(18)} ${docs.length} contributions`
    );
  }

  console.log(`\nDone. All accounts use password: ${PASSWORD}`);
  console.log("Demo logins: arjun@proofly.demo (streak hero), rahul@proofly.demo (meta ads + imports)");
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
