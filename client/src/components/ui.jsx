// Small shared UI atoms — keeps pages lean and consistent.
import { useState } from "react";
import { formatMetric } from "../config/roles";
import { Icon } from "./icons";

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-card border border-line rounded-2xl p-5 ${className}`}>
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
      <Icon name="flame" size={big ? 22 : 15} className="text-orange-400" />
      <span className={`font-bold ${big ? "text-2xl" : "text-sm"} text-orange-400`}>
        {streak}
      </span>
      <span className={`text-mute ${big ? "text-sm" : "text-xs"}`}>day streak</span>
    </div>
  );
}

export function VerificationBadge({ level }) {
  if (level === "synced")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2 py-0.5">
        <Icon name="zap" size={10} /> Synced from Meta API
      </span>
    );
  if (level === "imported")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-300 bg-blue-500/10 border border-blue-500/40 rounded-full px-2 py-0.5">
        <Icon name="check" size={10} /> Verified import
      </span>
    );
  if (level === "evidence")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-full px-2 py-0.5">
        <Icon name="paperclip" size={10} /> Evidence
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

export function Empty({ icon = "inbox", title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
      <Icon name={icon} size={36} className="text-mute mb-1" strokeWidth={1.4} />
      <div className="font-semibold">{title}</div>
      {hint && <div className="text-sm text-mute max-w-sm">{hint}</div>}
      {action}
    </div>
  );
}

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 bg-brand text-ink font-medium rounded-lg px-5 py-2.5 text-sm hover:bg-[#d0764c] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const inputCls = (error) =>
  `w-full bg-bg border rounded-xl px-3.5 py-2.5 text-sm outline-none transition placeholder:text-mute/50 focus:border-brand/70 focus:ring-2 focus:ring-brand/15 ${
    error ? "border-red-500" : "border-line"
  }`;

export function Input({ label, error, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium text-mute mb-1.5">{label}</span>
      )}
      <input className={inputCls(error)} {...props} />
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}

function EyeIcon({ off }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="4" y1="20" x2="20" y2="4" />}
    </svg>
  );
}

export function PasswordInput({ label, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-medium text-mute mb-1.5">{label}</span>
      )}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${inputCls(error)} pr-10`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-mute hover:text-ink transition"
        >
          <EyeIcon off={show} />
        </button>
      </div>
      {error && <span className="block text-xs text-red-400 mt-1">{error}</span>}
    </label>
  );
}
