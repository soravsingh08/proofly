// Seeds one rich demo account per profession so judges can explore
// every field via the demo login. Idempotent: existing users with
// contributions are left untouched. Run: npm run seed-demo
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Contribution from "../models/Contribution.js";
import { ROLES, sanitizeMetrics } from "../config/roles.js";

const PERSONAS = {
  developer: { username: "arjun", name: "Arjun Mehta", headline: "Ships daily. Breaks nothing (mostly)." },
  digital_marketing: { username: "nisha", name: "Nisha Verma", headline: "Growth marketer. Campaigns that compound." },
  sales: { username: "rohan", name: "Rohan Gupta", headline: "Pipeline builder. Closes on Fridays." },
  hr: { username: "meera", name: "Meera Iyer", headline: "Talent partner. People first, always." },
  meta_ads: { username: "kabir", name: "Kabir Shah", headline: "Performance marketer. ROAS obsessive." },
  designer: { username: "zoya", name: "Zoya Khan", headline: "Design and motion. Ship, then polish." },
};

const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

// value ranges per metric type; heavier metrics happen less and smaller
function sampleValue(m) {
  if (m.type === "currency") return 500 + Math.floor(Math.random() * 4500);
  if (m.type === "percent") return +(1 + Math.random() * 2.5).toFixed(1);
  if (m.type === "ratio") return +(1.2 + Math.random() * 3).toFixed(1);
  const cap = Math.max(1, 6 - (m.weight || 1));
  return 1 + Math.floor(Math.random() * cap);
}

function buildDays(roleKey) {
  const role = ROLES[roleKey];
  const days = [];
  const span = 230; // ~7.5 months of history
  const streak = 25 + Math.floor(Math.random() * 60); // live streak at the end
  const today = Date.now();

  for (let i = span; i >= 0; i--) {
    const dateMs = today - i * DAY;
    const inStreak = i < streak;
    const weekday = new Date(dateMs).getDay() % 6 !== 0;
    const active = inStreak || Math.random() < (weekday ? 0.62 : 0.25);
    if (!active) continue;

    const raw = {};
    for (const m of role.metrics) {
      const p = (m.weight || 0) > 2 ? 0.35 : 0.75; // rare big wins, daily bread often
      if (Math.random() < p) raw[m.key] = sampleValue(m);
    }
    const clean = sanitizeMetrics(roleKey, raw);
    if (!clean) continue;

    const roll = Math.random();
    const verification = roll < 0.62 ? "self_reported" : roll < 0.87 ? "evidence" : "imported";
    days.push({
      date: iso(dateMs),
      metrics: clean.metrics,
      weightedTotal: clean.weightedTotal,
      verification,
      source: verification === "imported" ? "excel_import" : "manual",
      evidenceUrl: verification === "evidence" ? "https://github.com/soravsingh08/proofly" : "",
      note: Math.random() < 0.18 ? "Solid day. Kept the streak alive." : "",
    });
  }
  return days;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const passwordHash = await bcrypt.hash("proofly-demo-2026", 10);

  for (const [roleKey, p] of Object.entries(PERSONAS)) {
    if (!ROLES[roleKey]) continue;
    let user = await User.findOne({ username: p.username });
    if (!user) {
      user = await User.create({
        name: p.name,
        email: `${p.username}@demo.proofly.app`,
        username: p.username,
        passwordHash,
        role: roleKey,
        headline: p.headline,
      });
      console.log(`created @${p.username} (${roleKey})`);
    } else {
      console.log(`exists  @${p.username} (${user.role})`);
    }

    const existing = await Contribution.countDocuments({ userId: user._id });
    if (existing > 0) {
      console.log(`  keeps ${existing} contributions, skipping seed`);
      continue;
    }
    const days = buildDays(user.role || roleKey);
    await Contribution.insertMany(
      days.map((d) => ({ ...d, userId: user._id, role: user.role || roleKey }))
    );
    console.log(`  seeded ${days.length} days of ${user.role || roleKey} work`);
  }

  await mongoose.disconnect();
  console.log("demo seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
