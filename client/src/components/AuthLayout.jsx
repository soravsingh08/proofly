// Shared layout for Login / Register — the form sits dead-center with
// a soft glow behind it; floating decorative cards drift on the sides
// (different set per page via `decor`). Decorations hide below lg.
import { StreakBadge, VerificationBadge } from "./ui";

// deterministic pseudo-random cells — same trick as the landing HeroGraph
function MiniGraph({ weeks = 12, cell = 10, accent = "#c4633a" }) {
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const v = r - Math.floor(r);
    const weekday = i % 7 !== 0 && i % 7 !== 6;
    return v < (weekday ? 0.75 : 0.25) ? Math.ceil(v * 4) : 0;
  });
  return (
    <div
      className="grid grid-rows-7 grid-flow-col gap-[3px]"
      style={{ "--accent": accent }}
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

function FloatCard({ className = "", children }) {
  return (
    <div
      className={`absolute bg-card/90 backdrop-blur border border-line rounded-2xl p-4 shadow-xl shadow-black/30 ${className}`}
    >
      {children}
    </div>
  );
}

// Login: "your work is waiting" — the graph and the streak you left behind
function LoginDecor() {
  return (
    <>
      <FloatCard className="float-slow left-2 xl:left-12 top-16">
        <MiniGraph />
        <p className="text-[10px] text-mute mt-2.5">
          your year, one square a day
        </p>
      </FloatCard>
      <FloatCard className="float-slower right-2 xl:right-12 bottom-16">
        <StreakBadge streak={132} size="sm" />
        <p className="text-[10px] text-mute mt-2.5">@arjun — still going</p>
      </FloatCard>
    </>
  );
}

// Register: what you're about to get — trust badges and a public URL
function RegisterDecor() {
  return (
    <>
      <FloatCard className="float-slow left-2 xl:left-12 top-20 space-y-2">
        <VerificationBadge level="synced" />
        <VerificationBadge level="imported" />
        <VerificationBadge level="evidence" />
        <p className="text-[10px] text-mute pt-1">
          proof levels recruiters trust
        </p>
      </FloatCard>
      <FloatCard className="float-slower right-2 xl:right-12 top-24">
        <MiniGraph accent="#22c55e" weeks={10} />
        <p className="text-[10px] text-mute mt-2.5">
          proofly.app/u/<span className="text-ink">you</span>
        </p>
      </FloatCard>
    </>
  );
}

export default function AuthLayout({ title, subtitle, footer, decor = "login", children }) {
  return (
    <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20 min-h-[36rem]">
      <div
        className="hero-glow absolute inset-x-0 -top-8 h-[420px] pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="hidden lg:block absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        {decor === "register" ? <RegisterDecor /> : <LoginDecor />}
      </div>

      {/* the form — centered, above the decorations */}
      <div className="relative z-10 w-full max-w-sm mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-center">
          {title}
        </h1>
        <p className="text-sm text-mute mt-2 mb-7 text-center">{subtitle}</p>
        {children}
        <p className="text-sm text-mute mt-6 text-center">{footer}</p>
      </div>
    </div>
  );
}
