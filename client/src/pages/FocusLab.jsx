// Focus lab — science-backed focus techniques from the books, wired
// to the timer. Plus box breathing, the Navy-tested reset exercise.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Card } from "../components/ui";
import { Icon } from "../components/icons";
import { FocusTimer } from "../components/PlannerTimer";

gsap.registerPlugin(ScrollTrigger);

const TECHNIQUES = [
  {
    title: "Pomodoro sprints",
    book: "The Pomodoro Technique",
    author: "Francesco Cirillo",
    text: "Work in 25-minute sprints with short breaks. A near deadline shrinks the task in front of you and beats procrastination at its own game.",
    minutes: 25,
  },
  {
    title: "Deep work blocks",
    book: "Deep Work",
    author: "Cal Newport",
    text: "Protect 90 distraction-free minutes. Cognitively demanding work only compounds when attention is undivided, and 90 minutes matches your brain's natural ultradian cycle.",
    minutes: 90,
  },
  {
    title: "The two-minute rule",
    book: "Getting Things Done",
    author: "David Allen",
    text: "If it takes under two minutes, do it now. Tracking a tiny task costs more attention than simply finishing it.",
    minutes: 2,
  },
  {
    title: "Never miss twice",
    book: "Atomic Habits",
    author: "James Clear",
    text: "Missing once is an accident. Missing twice is the start of a new habit. This is exactly why your streak has freezes, use them and get back on the graph.",
    link: { to: "/dashboard", label: "Check your streak" },
  },
  {
    title: "Eat the frog",
    book: "Eat That Frog!",
    author: "Brian Tracy",
    text: "Do the most important task first. Willpower is a morning resource, spend it on the work that deserves a square.",
    link: { to: "/log", label: "Log the big one" },
  },
  {
    title: "Engineer your flow",
    book: "Flow",
    author: "Mihaly Csikszentmihalyi",
    text: "Flow needs a clear goal and immediate feedback. A weekly target plus a square that lights up the moment you log is that loop, by design.",
    link: { to: "/dashboard", label: "Set a weekly goal" },
  },
];

// box breathing: 4s in, 4s hold, 4s out, 4s hold — the reset used by
// Navy SEALs and backed by HRV research
const PHASES = ["Breathe in", "Hold", "Breathe out", "Hold"];

function BreathingBox() {
  const [on, setOn] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [on]);

  const phase = Math.floor((t % 16) / 4);
  const secs = 4 - (t % 4);
  const grow = phase === 0 || phase === 1;

  return (
    <Card className="flex flex-col items-center text-center">
      <div className="w-full flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="sparkles" size={14} className="text-brand" /> Box breathing
        </h2>
        <span className="text-[11px] text-mute">4 · 4 · 4 · 4</span>
      </div>

      <div className="relative my-4 flex items-center justify-center" style={{ height: 150 }}>
        <div
          className="rounded-2xl border-2 border-brand/60 bg-brand/10"
          style={{
            width: 70,
            height: 70,
            transform: on ? (grow ? "scale(1.9)" : "scale(1)") : "scale(1.3)",
            transition: "transform 3.6s cubic-bezier(0.45, 0, 0.55, 1)",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold">{on ? PHASES[phase] : "Ready?"}</span>
          {on && <span className="text-xs text-mute tabular-nums mt-0.5">{secs}</span>}
        </div>
      </div>

      <button
        onClick={() => {
          setOn(!on);
          setT(0);
        }}
        className={`w-full rounded-lg py-2 text-sm font-medium transition ${
          on
            ? "border border-line text-mute hover:text-ink"
            : "bg-brand text-ink hover:bg-[#d0764c]"
        }`}
      >
        {on ? "Stop" : "Start a minute of calm"}
      </button>
      <p className="text-[11px] text-mute mt-3">
        Four rounds lower your heart rate and reset attention before a sprint.
      </p>
    </Card>
  );
}

export default function FocusLab() {
  const root = useRef(null);
  const pickRef = useRef(null);
  const timerRef = useRef(null);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
      );
      gsap.utils.toArray(".lab-card").forEach((el, i) => {
        gsap.from(el, {
          y: 32,
          opacity: 0,
          duration: 0.7,
          delay: (i % 3) * 0.07,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  function tryMinutes(m) {
    pickRef.current?.(m);
    timerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div ref={root} className="relative max-w-5xl mx-auto px-4 py-10">
      <div data-rise className="text-center max-w-2xl mx-auto mb-10">
        <div className="text-[11px] uppercase tracking-[0.3em] text-brand mb-4">
          Focus lab
        </div>
        <h1 className="text-4xl md:text-5xl font-medium tracking-tight leading-tight">
          Train focus like a muscle
        </h1>
        <p className="text-mute mt-4 leading-relaxed">
          Six techniques from the books, each one research-backed. Pick one,
          run the timer, then log what you shipped while it's fresh.
        </p>
      </div>

      {/* the tools */}
      <div data-rise ref={timerRef} className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-14">
        <FocusTimer pickRef={pickRef} />
        <BreathingBox />
      </div>

      {/* the science */}
      <div data-rise className="flex items-center gap-3 mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-brand font-semibold shrink-0">
          From the books
        </h2>
        <span className="h-px flex-1 bg-line/70" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TECHNIQUES.map((tq) => (
          <div key={tq.title} className="lab-card bg-card border border-line/70 rounded-2xl p-5 flex flex-col">
            <h3 className="font-semibold">{tq.title}</h3>
            <p className="text-[11px] text-brand mt-0.5">
              {tq.book} · {tq.author}
            </p>
            <p className="text-sm text-mute leading-relaxed mt-3 flex-1">{tq.text}</p>
            {tq.minutes ? (
              <button
                onClick={() => tryMinutes(tq.minutes)}
                className="mt-4 inline-flex items-center gap-1.5 self-start text-xs bg-brand/10 border border-brand/50 text-brand font-medium rounded-lg px-3.5 py-2 hover:bg-brand/20 transition"
              >
                <Icon name="zap" size={12} /> Run {tq.minutes} minutes
              </button>
            ) : (
              <Link
                to={tq.link.to}
                className="mt-4 inline-flex items-center gap-1.5 self-start text-xs border border-line rounded-lg px-3.5 py-2 text-mute hover:text-ink hover:border-mute transition"
              >
                {tq.link.label} →
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-mute mt-12">
        One focused block a day is enough to keep the streak alive.
      </p>
    </div>
  );
}
