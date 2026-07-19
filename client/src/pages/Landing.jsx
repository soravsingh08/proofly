import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import DemoButton from "../components/DemoButton";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import api from "../api/client";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Button, Spinner, StreakBadge, VerificationBadge } from "../components/ui";
import { Icon } from "../components/icons";

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

/* ---- hand-drawn doodles, GitHub-style annotations ---- */

function DoodleUnderline({ className = "" }) {
  return (
    <svg viewBox="0 0 220 14" fill="none" className={className} aria-hidden="true">
      <path
        className="doodle-draw"
        d="M3 10c30-6 62-7 88-4s52 6 78 3c18-2 36-4 48-6"
        stroke="#c4633a"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoodleArrow({ className = "" }) {
  return (
    <svg viewBox="0 0 110 130" fill="none" className={`doodle-arrow ${className}`} aria-hidden="true">
      <path
        className="doodle-draw-scroll"
        d="M14 6c8 34 24 62 56 82 8 5 16 9 26 12"
        stroke="#c4633a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        className="doodle-draw-scroll"
        d="M82 88l16 14-20 6"
        stroke="#c4633a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoodleSparkle({ className = "" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {["M20 4v10", "M20 26v10", "M4 20h10", "M26 20h10"].map((d) => (
        <path
          key={d}
          className="doodle-draw-scroll"
          d={d}
          stroke="#c4633a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// Fake mini-heatmap — pure visual, no data needed
function HeroGraph({ color, weeks = 13, cell = 9 }) {
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const v = r - Math.floor(r);
    const weekday = i % 7 !== 0 && i % 7 !== 6;
    return v < (weekday ? 0.75 : 0.25) ? Math.ceil(v * 4) : 0;
  });
  return (
    <div
      className="grid grid-rows-7 grid-flow-col gap-[3px]"
      style={{ "--accent": color }}
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

// GitHub-hero-style "product screenshot": a live-looking profile card
function ProfileMock() {
  return (
    <div data-reveal className="relative mx-auto max-w-3xl mt-20">
      {/* hand-drawn annotation, GitHub-style */}
      <div className="hidden lg:block absolute -left-40 -top-10 w-32 text-left">
        <span className="text-sm text-mute italic">this could be you</span>
        <DoodleArrow className="w-20 mt-2 ml-10" />
      </div>
      <div className="bg-card border border-line rounded-2xl p-6 md:p-8 text-left shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center font-semibold text-brand">
              AM
            </div>
            <div>
              <div className="font-semibold">Arjun Mehta</div>
              <div className="text-xs text-mute">
                @arjun · Software Developer
              </div>
            </div>
          </div>
          <StreakBadge streak={132} size="sm" />
        </div>

        <div className="mt-6 overflow-x-auto">
          <HeroGraph color="#22c55e" weeks={40} cell={10} />
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["1,388", "Commits"],
            ["265", "Pull Requests"],
            ["233", "Bugs Fixed"],
            ["53", "Features Shipped"],
          ].map(([v, l]) => (
            <div
              key={l}
              className="bg-card2 border border-line rounded-xl px-3 py-3 text-center"
            >
              <div className="font-semibold">{v}</div>
              <div className="text-[10px] text-mute mt-0.5">{l}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2 flex-wrap">
          <VerificationBadge level="synced" />
          <VerificationBadge level="imported" />
          <VerificationBadge level="evidence" />
        </div>
      </div>
    </div>
  );
}

// Mini "screenshot" of the résumé page — same sheet the real
// /u/:username/resume renders, mocked with the hero profile's data
function ResumeMock() {
  return (
    <div data-reveal className="relative">
      <div className="bg-[#faf7f2] text-[#1c1814] rounded-2xl shadow-2xl shadow-black/50 p-6 rotate-1 hover:rotate-0 transition-transform duration-500">
        <div className="flex items-start justify-between gap-3 pb-4 border-b-2 border-[#1c1814]">
          <div>
            <div className="text-xl font-semibold tracking-tight">Arjun Mehta</div>
            <div className="text-xs font-medium text-[#22c55e] mt-0.5">
              Software Developer
            </div>
          </div>
          <div className="text-right text-[10px] text-[#5f574d] shrink-0">
            <div className="font-medium text-[#1c1814]">@arjun</div>
            <div className="mt-0.5">proofly.app/u/arjun</div>
            <div className="mt-0.5">Verified proof-of-work · Proofly</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a7f72] mb-1.5">
            Summary
          </div>
          <p className="text-[11px] leading-relaxed">
            Arjun is a Software Developer with 365 active days of logged,
            verifiable work, currently on a 132-day streak. Across 1,124
            contributions he has shipped 53 features and fixed 233 bugs,
            with output backed by verified imports.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {["132-day daily streak", "1,388 commits logged", "53 features shipped"].map(
              (h) => (
                <span
                  key={h}
                  className="text-[9px] rounded-full px-2 py-0.5 border border-[#d8cfc2] bg-white"
                >
                  {h}
                </span>
              )
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a7f72] mb-1.5">
            Consistency
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["1,124", "contributions"],
              ["132 d", "current streak"],
              ["141 d", "longest streak"],
              ["365", "active days"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="bg-white border border-[#e4dccf] rounded-lg px-1 py-2 text-center"
              >
                <div className="text-sm font-semibold">{v}</div>
                <div className="text-[8px] text-[#8a7f72] mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a7f72] mb-1.5">
            Lifetime output
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["1,388", "Commits"],
              ["265", "Pull Requests"],
              ["233", "Bugs Fixed"],
              ["53", "Features"],
            ].map(([v, l]) => (
              <div key={l} className="border-l-2 border-[#22c55e] pl-2">
                <div className="text-sm font-semibold">{v}</div>
                <div className="text-[8px] text-[#8a7f72]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* floating download/share affordances */}
      <div className="absolute -bottom-5 right-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-brand text-ink text-xs font-medium rounded-lg px-3.5 py-2 shadow-lg shadow-black/40">
          <Icon name="download" size={13} /> Download PDF
        </span>
        <span className="hidden sm:inline-flex bg-card border border-line text-mute text-[11px] rounded-lg px-3 py-2 shadow-lg shadow-black/40">
          or share the live link
        </span>
      </div>
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.3em] text-brand mb-4">
      {children}
    </div>
  );
}

const STATS = [
  { n: 6, suffix: "", label: "professions, one platform" },
  { n: 1100, suffix: "+", label: "contributions logged" },
  { n: 132, suffix: " days", label: "longest live streak" },
  { n: 30, suffix: " sec", label: "to log a day's work" },
];

const TOP_STREAKS = [
  { rank: "1", name: "@arjun", role: "developer", streak: 132 },
  { rank: "2", name: "@priya", role: "digital_marketing", streak: 98 },
  { rank: "3", name: "@kabir", role: "meta_ads", streak: 74 },
];

export default function Landing() {
  const root = useRef(null);
  const spotBox = useRef(null);
  const [spotRole, setSpotRole] = useState(null);
  const [spotRows, setSpotRows] = useState(null);

  // clicking a role card pops up its spotlight — top-2 from that
  // role's live leaderboard + what counts as proof for it
  useEffect(() => {
    if (!spotRole) return;
    setSpotRows(null);
    api
      .get(`/leaderboard?role=${spotRole}`)
      .then((r) => setSpotRows(r.data.leaderboard.slice(0, 2)))
      .catch(() => setSpotRows([]));
  }, [spotRole]);

  // the graph lights up square by square when the popup opens
  useLayoutEffect(() => {
    if (!spotRole || !spotBox.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hm-cell",
        { opacity: 0 },
        { opacity: 1, duration: 0.4, stagger: { each: 0.0035, from: "random" }, ease: "power1.out" }
      );
    }, spotBox);
    return () => ctx.revert();
  }, [spotRole]);

  // once rows land: cards rise in and streak numbers count up
  useLayoutEffect(() => {
    if (!spotRows || !spotBox.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".spot-rise",
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: "power3.out" }
      );
      gsap.utils.toArray(".spot-streak").forEach((el) => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: +el.dataset.n,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = Math.round(obj.v);
          },
        });
      });
    }, spotBox);
    return () => ctx.revert();
  }, [spotRows]);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // hero entrance — masked line reveal, then copy and CTAs
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-glow", { opacity: 0, duration: 1.4, ease: "power2.out" }, 0)
        .from(".hero-eyebrow", { y: 24, opacity: 0, duration: 0.7 }, 0.1)
        .from(".hero-line", { yPercent: 115, duration: 1, stagger: 0.14 }, 0.2)
        .from(".hero-sub", { y: 24, opacity: 0, duration: 0.7 }, "-=0.55")
        .from(".hero-cta", { y: 18, opacity: 0, duration: 0.6, stagger: 0.08 }, "-=0.45")
        .fromTo(
          ".doodle-draw",
          { drawSVG: "0%" },
          { drawSVG: "100%", duration: 1.1, ease: "power2.inOut" },
          "-=0.45"
        );

      // doodles that draw themselves in on scroll
      gsap.utils.toArray(".doodle-draw-scroll").forEach((el) => {
        gsap.fromTo(
          el,
          { drawSVG: "0%" },
          {
            drawSVG: "100%",
            duration: 1,
            ease: "power2.inOut",
            scrollTrigger: { trigger: el, start: "top 85%" },
          }
        );
      });

      // generic scroll reveals
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 44,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      // clothesline polaroids drop in one after another, then the CSS
      // sway takes over (it owns rotate; GSAP only touches y/opacity)
      gsap.set(".hang-card", { y: -30, opacity: 0 });
      ScrollTrigger.batch(".hang-card", {
        start: "top 90%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "bounce.out",
            stagger: 0.1,
            overwrite: true,
          }),
      });

      // stats count up when the band scrolls in
      gsap.utils.toArray(".stat").forEach((el) => {
        const target = +el.dataset.n;
        const suffix = el.dataset.suffix || "";
        const num = el.querySelector(".stat-num");
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => {
            num.textContent = Math.round(obj.v).toLocaleString() + suffix;
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative overflow-x-clip">
      {/* terracotta spotlight behind the hero */}
      <div className="hero-glow absolute inset-x-0 top-0 h-[640px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4">
        {/* ============ hero ============ */}
        <section className="relative text-center pt-24 pb-8">
          <div className="hero-eyebrow text-[11px] uppercase tracking-[0.3em] text-mute mb-8">
            GitHub for every profession
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-[92px] font-medium tracking-[-0.04em] leading-[0.98]">
            <span className="block overflow-hidden pb-[0.06em] -mb-[0.06em]">
              <span className="hero-line block">Proof of Work</span>
            </span>
            <span className="block overflow-hidden pb-[0.28em] -mb-[0.28em]">
              <span className="hero-line block relative">
                Reinvented
                <DoodleUnderline className="absolute left-1/2 -translate-x-1/2 -bottom-[0.24em] w-[48%]" />
              </span>
            </span>
          </h1>
          <p className="hero-sub text-mute mt-8 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
            Don't tell recruiters what you did. Prove it, every day. Sales,
            marketing, HR, ads and design professionals get a public
            proof-of-work profile, built one contribution at a time.
          </p>
          <div className="flex justify-center gap-3 mt-10">
            <Link to="/register" className="hero-cta">
              <Button className="px-7 py-3">Start your streak</Button>
            </Link>
            {/* wrapper carries the GSAP entrance class; the button keeps
                its CSS transition — the two must not share an element */}
            <span className="hero-cta">
              <DemoButton
                label="Try the live demo"
                className="border border-line rounded-lg px-7 py-3 text-sm text-ink hover:border-mute transition"
              />
            </span>
          </div>

          {/* the "product screenshot", GitHub-style */}
          <ProfileMock />
        </section>

        {/* ============ stats band ============ */}
        <section className="border-y border-line mt-8 mb-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="stat text-center"
              data-n={s.n}
              data-suffix={s.suffix}
            >
              <div className="stat-num text-4xl md:text-5xl font-medium tracking-tight">
                {s.n.toLocaleString()}
                {s.suffix}
              </div>
              <div className="text-xs text-mute mt-2">{s.label}</div>
            </div>
          ))}
        </section>

        {/* ============ feature: every profession ============ */}
        <section className="pt-8 pb-16">
          <div data-reveal className="text-center max-w-2xl mx-auto mb-12">
            <Eyebrow>Beyond developers</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
              A contribution graph for every craft
            </h2>
            <p className="text-mute mt-5 leading-relaxed">
              Calls closed, campaigns shipped, hires made, designs delivered.
              If it's real work, it lights up a square. Each role gets its own
              metrics and its own color.
            </p>
          </div>
          {/* polaroids of every department, pegged to a sagging line,
              swaying like a breeze is moving through them */}
          <div className="relative pt-8">
            <svg
              viewBox="0 0 1200 130"
              preserveAspectRatio="none"
              className="absolute inset-x-0 -top-2 w-full h-32 pointer-events-none"
              aria-hidden="true"
            >
              <path
                d="M-20 24 Q600 124 1220 24"
                stroke="var(--rope)"
                strokeWidth="2"
                fill="none"
              />
            </svg>

            <div className="flex gap-4 md:gap-5 overflow-x-auto lg:overflow-visible lg:justify-center pb-10 px-1">
              {ROLE_KEYS.map((k, i) => {
                const role = ROLES[k];
                // drops sampled from the rope's quadratic curve at each
                // peg's x position, so every clip sits ON the line
                const drop = [5, 28, 40, 40, 28, 5][i % 6];
                const tilt = [-7, -4, -1.5, 1.5, 4, 7][i % 6];
                return (
                  <div key={k} className="hang-card shrink-0">
                    <div style={{ transform: `translateY(${drop}px)` }}>
                      <div
                        className="sway"
                        style={{
                          "--sway-dur": `${5.2 + i * 0.6}s`,
                          "--sway-delay": `${i * 0.35}s`,
                        }}
                      >
                        {/* pivot at the peg, so tilting never slides the
                            clip off the rope — the card swings below it */}
                        <div style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "top center" }}>
                          <div className="relative w-40 md:w-44">
                            {/* terracotta peg */}
                            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex justify-center pt-1 w-4 h-7 rounded-[4px] bg-brand shadow-md shadow-black/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-bg" />
                            </span>
                            {/* white polaroid, photo = the role's graph */}
                            <div className="bg-[var(--paper)] border border-[var(--paper-line)] rounded-xl p-2 pb-3 shadow-xl shadow-black/40">
                              <div data-theme="dark" className="bg-[#131311] rounded-lg p-2.5 overflow-hidden">
                                <HeroGraph color={role.color} weeks={9} cell={7} />
                              </div>
                              <div className="px-1.5 pt-2.5">
                                <div className="flex items-center gap-1.5 text-[#1c1814] font-semibold text-[13px]">
                                  <span style={{ color: role.color }}>
                                    <Icon name={role.icon} size={13} />
                                  </span>
                                  {role.label}
                                </div>
                                <div className="text-[#8a7f72] text-[10.5px] mt-0.5 leading-snug">
                                  {role.metrics.slice(0, 3).map((m) => m.label).join(" · ")}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* role spotlight — pops up on card click; portaled to body so
              gsap transforms on ancestors can't break the fixed centering */}
          {spotRole && createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSpotRole(null)}
            >
            <div
              ref={spotBox}
              className="relative bg-card border rounded-2xl p-6 md:p-7 w-full max-w-2xl max-h-[85vh] overflow-y-auto pop-in"
              style={{ borderColor: `${ROLES[spotRole].color}40` }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* role-colored wash behind the header */}
              <div
                className="absolute inset-x-0 top-0 h-48 pointer-events-none"
                style={{
                  background: `radial-gradient(60% 100% at 50% 0%, ${ROLES[spotRole].color}26, transparent)`,
                }}
              />
              <div className="flex items-start gap-3 mb-5">
                <span
                  className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: `${ROLES[spotRole].color}55`,
                    background: `${ROLES[spotRole].color}1a`,
                    color: ROLES[spotRole].color,
                  }}
                >
                  <Icon name={ROLES[spotRole].icon} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{ROLES[spotRole].label}</div>
                  <div className="text-xs text-mute">
                    Ranked by daily consistency — streaks, not claims.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSpotRole(null)}
                  className="text-mute hover:text-ink text-sm px-1"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* the graph they're signing up to light up */}
              <div
                className="flex justify-center mb-5 opacity-80 pointer-events-none"
                style={{
                  maskImage: "linear-gradient(to bottom, black 40%, transparent)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent)",
                }}
              >
                <HeroGraph color={ROLES[spotRole].color} weeks={52} cell={7} />
              </div>

              <div className="text-[11px] uppercase tracking-[0.3em] text-mute mb-3">
                Leading right now
              </div>
              {spotRows === null ? (
                <div className="py-6 mb-6">
                  <Spinner />
                </div>
              ) : spotRows.length === 0 ? (
                <div className="spot-rise bg-card2 border border-line rounded-xl px-4 py-7 text-center mb-6">
                  <Icon name="trophy" size={20} className="text-mute mb-2" />
                  <p className="text-sm text-mute">
                    No one ranked yet — the #1 spot is wide open.
                  </p>
                </div>
              ) : (
                <div className={`grid gap-3 mb-5 ${spotRows.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {spotRows.map((r, i) => {
                    const medal = ["#e8b923", "#b8bcc4"][i];
                    return (
                      <Link
                        key={r.username}
                        to={`/u/${r.username}`}
                        className="spot-rise relative overflow-hidden bg-card2 border rounded-xl hover:-translate-y-0.5 transition"
                        style={{
                          borderColor: `${medal}${i === 0 ? "55" : "30"}`,
                          boxShadow: i === 0 ? "0 10px 40px -14px #e8b92345" : undefined,
                        }}
                      >
                        {/* medal wash from the corner */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: `radial-gradient(90% 90% at 0% 0%, ${medal}14, transparent)`,
                          }}
                        />
                        <span
                          className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{
                            color: medal,
                            borderColor: `${medal}50`,
                            background: `${medal}14`,
                          }}
                        >
                          <Icon name="trophy" size={10} /> #{i + 1}
                        </span>
                        <div className="flex items-center gap-3 p-4">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                            style={{
                              background: `${ROLES[spotRole].color}22`,
                              color: ROLES[spotRole].color,
                              boxShadow: i === 0 ? `0 0 0 2px ${medal}55` : undefined,
                            }}
                          >
                            {r.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{r.name}</div>
                            <div className="text-[11px] text-mute truncate">@{r.username}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-line/70 px-4 py-2.5">
                          <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                            <Icon name="flame" size={13} />{" "}
                            <span className="spot-streak" data-n={r.currentStreak}>
                              {r.currentStreak}
                            </span>
                            <span className="text-[10px] font-normal text-mute ml-0.5">
                              day streak
                            </span>
                          </span>
                          <span className="text-[10.5px] text-mute">
                            {r.activeDays} active days
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-center">
                <div className="spot-rise">
                  <div className="text-[11px] uppercase tracking-[0.3em] text-mute mb-3">
                    What counts as proof
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ROLES[spotRole].metrics.map((m) => (
                      <span
                        key={m.key}
                        className="inline-flex items-center gap-1.5 text-[11px] text-ink border border-line rounded-full px-2.5 py-1"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: ROLES[spotRole].color }}
                        />
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="spot-rise text-center">
                  <Link
                    to={`/register?role=${spotRole}`}
                    onClick={() => localStorage.setItem("proofly_role_intent", spotRole)}
                    className="block"
                  >
                    <Button className="w-full py-2.5">
                      <Icon name="flame" size={14} /> Join as {ROLES[spotRole].label}
                    </Button>
                  </Link>
                  <p className="text-xs text-mute mt-2.5">
                    Already on Proofly?{" "}
                    <Link
                      to={`/login?role=${spotRole}`}
                      onClick={() => localStorage.setItem("proofly_role_intent", spotRole)}
                      className="text-brand hover:underline"
                    >
                      Login as {ROLES[spotRole].label}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
            </div>,
            document.body
          )}
        </section>

        {/* ============ feature: streaks ============ */}
        <section className="grid md:grid-cols-2 gap-12 items-center py-16">
          <div data-reveal className="md:order-2">
            <Eyebrow>Consistency, gamified</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
              Streaks you'll fight
              <br />
              to keep alive
            </h2>
            <p className="text-mute mt-5 leading-relaxed">
              One log a day keeps the flame burning. Miss a day, lose the
              streak. It's the same loop that makes GitHub addictive, now working
              for your whole career. Climb the leaderboard while you're at it.
            </p>
          </div>
          <div data-reveal className="md:order-1 bg-card border border-line rounded-2xl p-6">
            <div className="flex justify-center mb-6">
              <StreakBadge streak={132} />
            </div>
            <div className="space-y-2">
              {TOP_STREAKS.map((r) => {
                const role = ROLES[r.role];
                return (
                  <div
                    key={r.name}
                    className="flex items-center gap-3 bg-card2 border border-line rounded-xl px-4 py-3"
                  >
                    <span className="text-mute text-sm w-5">#{r.rank}</span>
                    <Icon name={role.icon} size={14} style={{ color: role.color }} />
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs text-mute hidden sm:block">
                      {role.label}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-sm text-orange-400 font-semibold">
                      <Icon name="flame" size={13} /> {r.streak}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ feature: résumé ============ */}
        <section className="grid md:grid-cols-2 gap-12 items-center py-16">
          <div data-reveal>
            <Eyebrow>Proof to PDF</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
              Your résumé
              <br />
              writes itself
            </h2>
            <p className="text-mute mt-5 leading-relaxed">
              Every logged day becomes a line on a recruiter-ready résumé: an
              AI summary written from your real numbers, your streaks and your
              verified imports. Download it as a PDF in one click, or just
              share the live link: it keeps itself up to date as you keep
              showing up.
            </p>
            <div className="mt-8">
              <Link to="/u/arjun/resume">
                <Button>See a live résumé</Button>
              </Link>
            </div>
          </div>
          <ResumeMock />
        </section>

        {/* ============ feature: verified proof ============ */}
        <section className="grid md:grid-cols-2 gap-12 items-center py-16">
          <div data-reveal>
            <Eyebrow>Verified, not claimed</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
              A resume says it.
              <br />
              Proofly proves it.
            </h2>
            <p className="text-mute mt-5 leading-relaxed">
              Every contribution carries its verification level: synced
              straight from the Meta Ads API, imported from real exports, or
              backed by evidence. Recruiters see exactly how much to trust
              each number. That's the difference between a claim and a proof.
            </p>
          </div>
          <div data-reveal className="bg-card border border-line rounded-2xl p-6 space-y-4">
            {[
              ["synced", "Pulled from the Meta API, impossible to fake"],
              ["imported", "Parsed from a real platform export"],
              ["evidence", "Screenshot or link attached"],
            ].map(([level, desc]) => (
              <div key={level} className="flex items-center justify-between gap-4 bg-card2 border border-line rounded-xl px-4 py-3.5">
                <VerificationBadge level={level} />
                <span className="text-xs text-mute text-right">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============ final CTA ============ */}
        <section data-reveal className="relative text-center py-24">
          <DoodleSparkle className="absolute w-8 left-[18%] top-16 hidden md:block" />
          <DoodleSparkle className="absolute w-5 right-[20%] bottom-24 hidden md:block" />
          <h2 className="text-5xl md:text-7xl font-medium tracking-[-0.03em] leading-[1.02]">
            Start proving it
            <br />
            today
          </h2>
          <p className="text-mute mt-6 max-w-md mx-auto">
            Your first green square is 30 seconds away. Free during beta.
          </p>
          <div className="flex justify-center gap-3 mt-9">
            <Link to="/register">
              <Button className="px-8 py-3.5 text-base">
                Create your profile
              </Button>
            </Link>
          </div>
        </section>

      </div>

      {/* ============ footer — brand, links, living heatmap strip ============ */}
      <footer className="border-t border-line mt-8">
        <div className="max-w-6xl mx-auto px-4 py-14 flex flex-col md:flex-row justify-between gap-10">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
              <span className="font-semibold text-lg tracking-tight">Proofly</span>
            </div>
            <p className="text-sm text-mute mt-4 leading-relaxed">
              The contribution graph for every profession. Log real work, keep
              the streak, and let recruiters see proof, not promises.
            </p>
          </div>
          <div className="flex gap-16 sm:gap-24">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-mute mb-4">
                Product
              </div>
              <div className="space-y-2.5 text-sm">
                <Link to="/leaderboard" className="block text-ink/80 hover:text-ink transition">Leaderboard</Link>
                <Link to="/u/arjun" className="block text-ink/80 hover:text-ink transition">Live profile</Link>
                <Link to="/u/arjun/resume" className="block text-ink/80 hover:text-ink transition">Résumé</Link>
                <Link to="/about" className="block text-ink/80 hover:text-ink transition">About us</Link>
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-mute mb-4">
                Get started
              </div>
              <div className="space-y-2.5 text-sm">
                <Link to="/register" className="block text-ink/80 hover:text-ink transition">Sign up</Link>
                <Link to="/login" className="block text-ink/80 hover:text-ink transition">Login</Link>
              </div>
            </div>
          </div>
        </div>

        {/* a strip of the product itself — cells breathing on their own clocks */}
        <div
          aria-hidden="true"
          className="flex justify-center gap-[3px] overflow-hidden px-1"
          style={{ "--accent": "#c4633a" }}
        >
          {Array.from({ length: 140 }, (_, i) => {
            const r = Math.sin(i * 7.13) * 10000;
            const v = r - Math.floor(r);
            const level = v < 0.45 ? 0 : (Math.ceil(v * 8) % 4) + 1;
            return (
              <div
                key={i}
                className={`hm-cell hm-${level} footer-cell shrink-0`}
                style={{ width: 9, height: 9, animationDelay: `${(v * 5).toFixed(2)}s` }}
              />
            );
          })}
        </div>

        <div className="border-t border-line mt-6">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-mute">
            <span>© 2026 Proofly. Consistency you can't fake.</span>
            <span>Built in 24 hours</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
