// Week planner + focus timer — the dashboard's productivity corner.
// Planner persists via /api/planner; the timer is local and nudges
// you to log what you shipped when a session completes.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api, { errMsg } from "../api/client";
import { Card } from "./ui";
import { Icon } from "./icons";
import { toast } from "./toast";
import { addDays, localToday, prettyDate } from "../utils/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Monday of the week containing `date` (yyyy-mm-dd)
function mondayOf(date) {
  const d = new Date(date + "T12:00:00");
  const shift = (d.getDay() + 6) % 7;
  return addDays(date, -shift);
}

export function WeekPlanner() {
  const today = localToday();
  const [offset, setOffset] = useState(0); // weeks from current
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(today);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const monday = addDays(mondayOf(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const load = useCallback(() => {
    api
      .get(`/planner?from=${monday}&to=${addDays(monday, 6)}`)
      .then((r) => setTasks(r.data.tasks))
      .catch(() => {});
  }, [monday]);

  useEffect(load, [load]);

  // keep the selected day inside the visible week
  useEffect(() => {
    if (!days.includes(selected)) setSelected(offset === 0 ? today : days[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monday]);

  async function add(e) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api.post("/planner", { text: text.trim(), date: selected });
      setTasks((t) => [...t, r.data.task]);
      setText("");
    } catch (err) {
      toast(errMsg(err, "Could not add task"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task) {
    setTasks((t) => t.map((x) => (x._id === task._id ? { ...x, done: !x.done } : x)));
    try {
      await api.patch(`/planner/${task._id}`, { done: !task.done });
    } catch {
      load();
    }
  }

  async function remove(task) {
    setTasks((t) => t.filter((x) => x._id !== task._id));
    try {
      await api.delete(`/planner/${task._id}`);
    } catch {
      load();
    }
  }

  const dayTasks = tasks.filter((t) => t.date === selected);
  const countFor = (d) => tasks.filter((t) => t.date === d);

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="check" size={14} className="text-brand" /> Week planner
        </h2>
        <div className="flex items-center gap-1 text-xs text-mute">
          <button
            onClick={() => setOffset(offset - 1)}
            className="w-6 h-6 rounded border border-line hover:text-ink hover:border-mute transition"
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="px-1.5 tabular-nums">
            {offset === 0 ? "This week" : offset === -1 ? "Last week" : offset === 1 ? "Next week" : prettyDate(monday)}
          </span>
          <button
            onClick={() => setOffset(offset + 1)}
            className="w-6 h-6 rounded border border-line hover:text-ink hover:border-mute transition"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      </div>

      {/* day strip — one soft segmented surface, not seven boxes */}
      <div className="grid grid-cols-7 gap-0.5 mb-3 bg-card2/60 rounded-xl p-1">
        {days.map((d, i) => {
          const active = selected === d;
          const dt = countFor(d);
          const allDone = dt.length > 0 && dt.every((t) => t.done);
          return (
            <button
              key={d}
              onClick={() => setSelected(d)}
              className={`rounded-lg py-1.5 text-center transition ${
                active ? "bg-brand/15 text-brand" : "text-mute hover:text-ink"
              } ${d === today ? "font-semibold" : ""}`}
            >
              <span className="block text-[10px]">{WEEKDAYS[i]}</span>
              <span className="block text-xs tabular-nums">{d.slice(8)}</span>
              <span
                className={`mx-auto mt-1 block w-1 h-1 rounded-full ${
                  dt.length === 0 ? "bg-transparent" : allDone ? "bg-green-400" : "bg-brand"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* tasks for the selected day */}
      <div className="flex-1 space-y-1.5 min-h-[96px]">
        {dayTasks.length === 0 && (
          <p className="text-xs text-mute pt-2">
            Nothing planned for {prettyDate(selected)} yet.
          </p>
        )}
        {dayTasks.map((t) => (
          <div key={t._id} className="group flex items-center gap-2.5 text-sm">
            <button
              onClick={() => toggle(t)}
              aria-label={t.done ? "Mark not done" : "Mark done"}
              className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition ${
                t.done ? "bg-green-500/90 border-green-500 text-black" : "border-line hover:border-brand"
              }`}
            >
              {t.done && <Icon name="check" size={10} />}
            </button>
            <span className={`flex-1 min-w-0 truncate ${t.done ? "line-through text-mute" : ""}`}>
              {t.text}
            </span>
            <button
              onClick={() => remove(t)}
              aria-label="Delete task"
              className="opacity-0 group-hover:opacity-100 text-mute hover:text-red-400 transition"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}

        {/* the middle never sits empty: suggestions on a blank week,
            a peek at the rest of the week otherwise */}
        {tasks.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            {["Ship one feature", "Clear the review queue", "Plan tomorrow's log"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setText(s)}
                className="text-[11px] border border-line/70 rounded-full px-2.5 py-1 text-mute hover:text-ink hover:border-mute transition"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
        {(() => {
          const others = tasks.filter((t) => t.date !== selected && !t.done).slice(0, 4);
          if (!others.length) return null;
          return (
            <div className="pt-2.5 mt-1 border-t border-line/60">
              <p className="text-[10px] uppercase tracking-[0.12em] text-mute mb-1.5">
                Also this week
              </p>
              {others.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setSelected(t.date)}
                  className="w-full flex items-center gap-2.5 text-xs text-mute hover:text-ink transition py-1 text-left"
                >
                  <span className="tabular-nums w-12 shrink-0 text-[10px] uppercase">
                    {WEEKDAYS[(new Date(t.date + "T12:00:00").getDay() + 6) % 7]}{" "}
                    {t.date.slice(8)}
                  </span>
                  <span className="truncate">{t.text}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      <form onSubmit={add} className="flex gap-2 mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={140}
          placeholder={`Plan something for ${prettyDate(selected)}…`}
          className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        <button
          disabled={busy || !text.trim()}
          className="bg-brand text-ink rounded-lg px-3.5 text-sm font-medium hover:bg-[#d0764c] disabled:opacity-40 transition"
        >
          Add
        </button>
      </form>
    </Card>
  );
}

const PRESETS = [25, 50, 5];

// celebration burst when a session lands — pure DOM, no library
function confetti() {
  const colors = ["#c4633a", "#22c55e", "#f59e0b", "#3b82f6", "#a855f7", "#ec4899"];
  for (let i = 0; i < 32; i++) {
    const el = document.createElement("span");
    el.style.cssText = `position:fixed;left:50%;top:38%;width:9px;height:9px;border-radius:2px;z-index:9999;pointer-events:none;background:${colors[i % colors.length]}`;
    document.body.appendChild(el);
    const ang = Math.random() * Math.PI * 2;
    const dist = 130 + Math.random() * 260;
    el.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 220}px) rotate(${Math.random() * 720 - 360}deg)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 700, easing: "cubic-bezier(0.2,0.6,0.3,1)" }
    ).onfinish = () => el.remove();
  }
}

function TimerRing({ size, stroke, pct, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#c4633a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function FocusTimer({ pickRef }) {
  const [minutes, setMinutes] = useState(25);
  const [customing, setCustoming] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [zen, setZen] = useState(false); // fullscreen focus mode
  const [sessions, setSessions] = useState(() =>
    Number(localStorage.getItem(`proofly_focus_${localToday()}`) || 0)
  );
  const tick = useRef(null);

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(tick.current);
          setRunning(false);
          setZen(false);
          const n = Number(localStorage.getItem(`proofly_focus_${localToday()}`) || 0) + 1;
          localStorage.setItem(`proofly_focus_${localToday()}`, String(n));
          setSessions(n);
          confetti();
          toast("Focus session done. Log what you shipped!");
          return minutes * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running, minutes]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  // countdown lives in the tab title while running
  useEffect(() => {
    if (running) document.title = `${mm}:${ss} · Proofly focus`;
    return () => {
      document.title = "Proofly | GitHub for Every Profession";
    };
  }, [running, mm, ss]);

  // Esc leaves focus mode (timer keeps running in the card)
  useEffect(() => {
    if (!zen) return;
    const onKey = (e) => e.key === "Escape" && setZen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zen]);

  function pick(m) {
    const v = Math.min(180, Math.max(1, Math.round(m)));
    setMinutes(v);
    setLeft(v * 60);
    setRunning(false);
  }

  // let a parent page (Focus lab) set durations from technique cards
  useEffect(() => {
    if (pickRef) pickRef.current = pick;
  });

  function applyCustom() {
    const v = Number(customVal);
    if (Number.isFinite(v) && v > 0) pick(v);
    setCustoming(false);
    setCustomVal("");
  }

  function start() {
    setRunning(true);
    setZen(true);
  }

  const total = minutes * 60;
  const pct = ((total - left) / total) * 100;

  return (
    <Card className="flex flex-col items-center text-center">
      <div className="w-full flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="zap" size={14} className="text-brand" /> Focus timer
        </h2>
        <span className="text-[11px] text-mute">
          {sessions} session{sessions === 1 ? "" : "s"} today
        </span>
      </div>

      <div className="my-2">
        <TimerRing size={116} stroke={7} pct={pct}>
          <span className="text-2xl font-bold tabular-nums">
            {mm}:{ss}
          </span>
        </TimerRing>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {PRESETS.map((m) => (
          <button
            key={m}
            onClick={() => pick(m)}
            className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
              minutes === m && !customing
                ? "border-brand text-brand bg-brand/10"
                : "border-line text-mute hover:text-ink"
            }`}
          >
            {m}m
          </button>
        ))}
        {customing ? (
          <input
            autoFocus
            type="number"
            min="1"
            max="180"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            onBlur={applyCustom}
            onKeyDown={(e) => e.key === "Enter" && applyCustom()}
            placeholder="min"
            className="w-16 bg-bg border border-brand/60 rounded-full px-2.5 py-1 text-[11px] text-center outline-none"
          />
        ) : (
          <button
            onClick={() => setCustoming(true)}
            className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
              !PRESETS.includes(minutes)
                ? "border-brand text-brand bg-brand/10"
                : "border-line text-mute hover:text-ink"
            }`}
            title="Custom duration"
          >
            {PRESETS.includes(minutes) ? "custom" : `${minutes}m ✎`}
          </button>
        )}
      </div>

      <div className="flex gap-2 w-full">
        <button
          onClick={() => (running ? setRunning(false) : start())}
          className="flex-1 bg-brand text-ink rounded-lg py-2 text-sm font-medium hover:bg-[#d0764c] transition"
        >
          {running ? "Pause" : left < total ? "Resume" : "Start focus"}
        </button>
        <button
          onClick={() => pick(minutes)}
          className="border border-line rounded-lg px-3.5 text-sm text-mute hover:text-ink hover:border-mute transition"
        >
          Reset
        </button>
      </div>
      <p className="text-[11px] text-mute mt-3">
        Starting opens focus mode. Finish, then log it while it's fresh.
      </p>

      {/* zen mode — the whole screen becomes the timer */}
      {zen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-2xl flex flex-col items-center justify-center no-print">
            <button
              onClick={() => setZen(false)}
              aria-label="Exit focus mode"
              className="absolute top-5 right-6 text-mute hover:text-ink transition"
            >
              <Icon name="x" size={20} />
            </button>
            <p className="text-[11px] uppercase tracking-[0.3em] text-brand mb-8">
              Focus mode
            </p>
            <TimerRing size={280} stroke={10} pct={pct}>
              <span className="text-6xl font-bold tabular-nums">
                {mm}:{ss}
              </span>
            </TimerRing>
            <p className="text-mute mt-8">
              {running ? "Stay with it. The square is earned." : "Paused."}
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setRunning(!running)}
                className="bg-brand text-ink rounded-lg px-8 py-2.5 text-sm font-medium hover:bg-[#d0764c] transition"
              >
                {running ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() => setZen(false)}
                className="border border-line rounded-lg px-5 py-2.5 text-sm text-mute hover:text-ink hover:border-mute transition"
              >
                Minimize
              </button>
            </div>
            <p className="text-[11px] text-mute mt-10">Esc to minimize · timer keeps running</p>
          </div>,
          document.body
        )}
    </Card>
  );
}
