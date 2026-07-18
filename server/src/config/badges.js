// Badges are data, same philosophy as roles.js — add a line here,
// it shows up everywhere. `earned` runs against the summary object
// from services/stats.js.
export const BADGES = [
  { key: "first_log", icon: "🌱", label: "Day One", desc: "Logged a first contribution", earned: (s) => s.totalContributions >= 1 },
  { key: "streak_7", icon: "⚡", label: "Week Warrior", desc: "7-day streak", earned: (s) => s.longestStreak >= 7 },
  { key: "streak_30", icon: "🔥", label: "On Fire", desc: "30-day streak", earned: (s) => s.longestStreak >= 30 },
  { key: "streak_100", icon: "🏆", label: "Unstoppable", desc: "100-day streak", earned: (s) => s.longestStreak >= 100 },
  { key: "days_30", icon: "📅", label: "Regular", desc: "30 active days", earned: (s) => s.activeDays >= 30 },
  { key: "days_100", icon: "💯", label: "Century Club", desc: "100 active days", earned: (s) => s.activeDays >= 100 },
  { key: "first_proof", icon: "📎", label: "Show, Don't Tell", desc: "First verified entry", earned: (s) => s.verifiedCount >= 1 },
  { key: "proof_25", icon: "✅", label: "Trust Machine", desc: "25 verified entries", earned: (s) => s.verifiedCount >= 25 },
  { key: "score_500", icon: "💎", label: "Halfway to Legend", desc: "Score above 500", earned: (s) => s.score >= 500 },
];

export function badgesFor(summary) {
  return BADGES.map(({ earned, ...b }) => ({ ...b, earned: earned(summary) }));
}
