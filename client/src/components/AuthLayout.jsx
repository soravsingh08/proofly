// Shared split-panel layout for Login / Register — brand panel with a
// live-looking heatmap on the left, the form on the right. On small
// screens only the form shows.
import { StreakBadge } from "./ui";

function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="#c4633a"
        strokeWidth="5"
        strokeDasharray="40 14"
        strokeLinecap="round"
        transform="rotate(-45 12 12)"
      />
    </svg>
  );
}

// deterministic pseudo-random cells — same trick as the landing HeroGraph
function MiniGraph({ weeks = 16, cell = 11 }) {
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const v = r - Math.floor(r);
    const weekday = i % 7 !== 0 && i % 7 !== 6;
    return v < (weekday ? 0.75 : 0.25) ? Math.ceil(v * 4) : 0;
  });
  return (
    <div
      className="grid grid-rows-7 grid-flow-col gap-[3px]"
      style={{ "--accent": "#c4633a" }}
    >
      {cells.map((l, i) => (
        <div
          key={i}
          className={`hm-cell hm-${l}`}
          style={{ width: cell, height: cell }}
        />
      ))}
    </div>
  );
}

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-2 gap-8 items-stretch">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-card border border-line rounded-3xl p-10 min-h-[34rem]">
        <div className="hero-glow absolute inset-0 pointer-events-none" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <Mark />
          <span className="font-semibold text-lg tracking-tight">Proofly</span>
        </div>
        <div className="relative">
          <h2 className="text-3xl xl:text-4xl font-medium tracking-tight leading-tight">
            Show up daily.
            <br />
            Let the graph talk.
          </h2>
          <p className="text-sm text-mute mt-4 leading-relaxed max-w-xs">
            Every square is a day of real, logged work — recruiters trust the
            pattern, not the pitch.
          </p>
          <div className="mt-8 overflow-hidden">
            <MiniGraph />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <StreakBadge streak={132} size="sm" />
            <span className="text-xs text-mute">@arjun — 132 days and counting</span>
          </div>
        </div>
        <div className="relative text-xs text-mute">
          Consistency you can't fake.
        </div>
      </div>

      {/* form side */}
      <div className="flex flex-col justify-center w-full max-w-sm mx-auto lg:mx-0 lg:justify-self-center">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-mute mt-2 mb-7">{subtitle}</p>
        {children}
        <p className="text-sm text-mute mt-6 text-center">{footer}</p>
      </div>
    </div>
  );
}
