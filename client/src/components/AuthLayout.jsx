// Shared layout for Login / Register — industry-standard split:
// a rich image-style brand panel on the left (gradient + texture +
// floating profile card, varies per page), the form on the right.
// Below lg only the form shows.
import { StreakBadge } from "./ui";

function Mark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
function MiniGraph({ weeks = 14, cell = 10, accent = "#c4633a" }) {
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

const PANELS = {
  login: {
    heading: ["Welcome back", "to your graph."],
    caption:
      "Every day you showed up is still here — pick the streak up right where you left it.",
    accent: "#c4633a",
    cardName: "Arjun Mehta",
    cardMeta: "@arjun · Software Developer",
    streak: 132,
  },
  register: {
    heading: ["Your work deserves", "a record."],
    caption:
      "Start today — one logged day becomes square one of your public proof.",
    accent: "#22c55e",
    cardName: "This could be you",
    cardMeta: "proofly.app/u/you",
    streak: 1,
  },
};

export default function AuthLayout({ title, subtitle, footer, variant = "login", children }) {
  const p = PANELS[variant] || PANELS.login;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 grid lg:grid-cols-2 gap-8 items-stretch">
      {/* image-style brand panel */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between rounded-3xl border border-line bg-gradient-to-br from-[#26140c] via-[#150f0b] to-[#0a0a0a] p-10 min-h-[36rem]">
        {/* subtle dot texture + glow, like a crafted illustration */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div
          className="hero-glow absolute inset-0 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2">
          <Mark />
          <span className="font-semibold text-lg tracking-tight">Proofly</span>
        </div>

        <div className="relative">
          <h2 className="text-4xl xl:text-[42px] font-medium tracking-tight leading-[1.08]">
            {p.heading[0]}
            <br />
            {p.heading[1]}
          </h2>
          <p className="text-sm text-mute mt-4 leading-relaxed max-w-xs">
            {p.caption}
          </p>
        </div>

        {/* floating profile-card "screenshot" */}
        <div className="relative bg-card/85 backdrop-blur border border-line rounded-2xl p-5 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full border flex items-center justify-center text-xs font-semibold"
                style={{
                  color: p.accent,
                  borderColor: `${p.accent}55`,
                  background: `${p.accent}1a`,
                }}
              >
                {p.cardName
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </div>
              <div>
                <div className="text-sm font-medium">{p.cardName}</div>
                <div className="text-[11px] text-mute">{p.cardMeta}</div>
              </div>
            </div>
            <StreakBadge streak={p.streak} size="sm" />
          </div>
          <div className="overflow-hidden">
            <MiniGraph accent={p.accent} />
          </div>
        </div>
      </div>

      {/* form column */}
      <div className="flex flex-col justify-center w-full max-w-sm mx-auto">
        <h1 className="text-2xl font-semibold tracking-tight text-center">
          {title}
        </h1>
        <p className="text-sm text-mute mt-2 mb-7 text-center">{subtitle}</p>

        <div className="relative overflow-hidden bg-card border border-line rounded-2xl p-6 md:p-7 shadow-2xl shadow-black/40">
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/60 to-transparent"
            aria-hidden="true"
          />
          {children}
        </div>

        <p className="text-sm text-mute mt-6 text-center">{footer}</p>
      </div>
    </div>
  );
}
