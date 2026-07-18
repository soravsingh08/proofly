import cron from "node-cron";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import { syncConnection } from "../services/connections.js";
import { dailyTotals, computeStreaks, summaryFor } from "../services/stats.js";
import { mailEnabled, sendMail } from "../services/mailer.js";
import { serverToday } from "../services/dates.js";

export function startJobs() {
  // 03:30 daily — refresh every connected repo/sheet/channel
  cron.schedule("30 3 * * *", async () => {
    const connections = await Connection.find().populate("userId");
    for (const conn of connections) {
      if (!conn.userId) continue;
      try {
        await syncConnection(conn, conn.userId);
      } catch (err) {
        console.error(`connection sync failed (${conn.label}):`, err.message);
      }
    }
  });

  if (!mailEnabled) {
    console.log("SMTP not configured — reminder/digest emails off");
    return;
  }

  // 18:00 daily — streak-at-risk nudge
  cron.schedule("0 18 * * *", async () => {
    const today = serverToday();
    const users = await User.find({ role: { $ne: null }, emailReminders: true });
    for (const u of users) {
      try {
        const totals = await dailyTotals(u._id);
        if (totals.has(today)) continue;
        const { current } = computeStreaks(totals, u.streakFreezes);
        if (current < 3) continue; // only nag when there's something to lose
        await sendMail(
          u.email,
          `Your ${current}-day streak is at risk 🔥`,
          `<p>Hi ${u.name},</p><p>You haven't logged anything today. One entry keeps your <b>${current}-day streak</b> alive.</p>`
        );
      } catch (err) {
        console.error(`reminder failed for ${u.username}:`, err.message);
      }
    }
  });

  // Monday 08:00 — weekly digest
  cron.schedule("0 8 * * 1", async () => {
    const users = await User.find({ role: { $ne: null }, emailReminders: true });
    for (const u of users) {
      try {
        const s = await summaryFor(u);
        await sendMail(
          u.email,
          "Your week on Proofly",
          `<p>Hi ${u.name},</p><p>Current streak: <b>${s.currentStreak}</b> · Active days: <b>${s.activeDays}</b> · Score: <b>${s.score}</b></p><p>Keep showing up.</p>`
        );
      } catch (err) {
        console.error(`digest failed for ${u.username}:`, err.message);
      }
    }
  });
}
