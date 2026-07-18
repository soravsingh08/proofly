// Small shared UI atoms — keeps pages lean and consistent.
import { formatMetric } from "../config/roles";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-card border border-line rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, type = "count", accent }) {
  return (
    <Card className="text-center">
      <div className="text-2xl font-bold" style={accent ? { color: accent } : {}}>
        {formatMetric(value, type)}
      </div>
      <div className="text-xs text-mute mt-1">{label}</div>
    </Card>
  );
}

export function StreakBadge({ streak, size = "lg" }) {
  const big = size === "lg";
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 ${
        big ? "px-5 py-2.5" : "px-3 py-1"
      }`}
    >
      <span className={big ? "text-2xl" : "text-base"}>🔥</span>
      <span className={`font-bold ${big ? "text-2xl" : "text-sm"} text-orange-400`}>
        {streak}
      </span>
      <span className={`text-mute ${big ? "text-sm" : "text-xs"}`}>day streak</span>
    </div>
  );
}

export function VerificationBadge({ level }) {
  if (level === "imported")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/40 rounded-full px-2 py-0.5">
        ✓ Verified import
      </span>
    );
  if (level === "evidence")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-full px-2 py-0.5">
        📎 Evidence
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-mute bg-white/5 border border-line rounded-full px-2 py-0.5">
      Self-reported
    </span>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-mute">
      <div className="w-8 h-8 border-2 border-line border-t-brand rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Empty({ icon = "📭", title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <div className="text-4xl">{icon}</div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="text-sm text-mute max-w-sm">{hint}</div>}
      {action}
    </div>
  );
}

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-brand text-black font-semibold rounded-lg px-4 py-2 text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs text-mute mb-1.5">{label}</span>}
      <input
        className={`w-full bg-bg border rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition ${
          error ? "border-red-500" : "border-line"
        }`}
        {...props}
      />
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}
