import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import api, { errMsg } from "../api/client";
import { toast } from "../components/toast";
import { useAuth } from "../context/AuthContext";
import { ROLES, formatMetric } from "../config/roles";
import Heatmap from "../components/Heatmap";
import { AmbientGlow, Card, VerificationBadge, Spinner, Empty, Button } from "../components/ui";
import { addDays, localToday, prettyDate } from "../utils/dates";
import { Icon } from "../components/icons";

const BADGE_ICONS = {
  first_log: "sprout",
  streak_7: "zap",
  streak_30: "flame",
  streak_100: "trophy",
  days_30: "check",
  days_100: "trophy",
  first_proof: "paperclip",
  proof_25: "check",
  score_500: "sparkles",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user, saveUser } = useAuth();
  const location = useLocation();
  const role = ROLES[user.role];
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [dateFilter, setDateFilter] = useState(null); // null = all days
  const [hmYear, setHmYear] = useState(null); // null = rolling last 12 months
  const rootRef = useRef(null);
  const popDate = location.state?.popDate || null;

  const load = useCallback(() => {
    Promise.all([
      api.get("/stats/summary"),
      api.get("/stats/heatmap"),
      api.get("/stats/insights"),
      api.get("/stats/badges"),
      api.get("/goals"),
      api.get(`/contributions?limit=30${dateFilter ? `&date=${dateFilter}` : ""}`),
      api.get("/users/streak-freezes"),
      api.get("/connections"),
    ])
      .then(([s, h, i, b, g, c, f, cn]) =>
        setData({
          summary: s.data.summary,
          heatmap: h.data.days,
          insights: i.data,
          badges: b.data.badges,
          goals: g.data.goals,
          recent: c.data.contributions,
          freezes: f.data,
          repos: cn.data.connections.filter((x) => x.type === "github_repo"),
        })
      )
      .catch(() => setError(true));
  }, [dateFilter]);

  useEffect(load, [load]);

  // sections rise in with a stagger once data is ready (first load only —
  // a filter change shouldn't replay the whole entrance)
  const animated = useRef(false);
  useLayoutEffect(() => {
    if (!data || !rootRef.current || animated.current) return;
    animated.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" }
      );
      document.querySelectorAll("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const n = { v: 0 };
        gsap.to(n, {
          v: target,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => (el.textContent = Math.round(n.v)),
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, [data]);

  if (error)
    return <Empty icon="alert" title="Couldn't load your dashboard" hint="Is the API running?" />;
  if (!data) return <Spinner label="Loading your proof-of-work…" />;

  const { summary, heatmap, insights, badges, goals, recent, freezes, repos } = data;
  const nudge = insights.nudges[0];
  const verifiedPct = summary.totalContributions
    ? Math.round((summary.verifiedCount / summary.totalContributions) * 100)
    : 0;

  return (
    <div ref={rootRef} className="relative max-w-5xl mx-auto px-4 py-8 space-y-4">
      <AmbientGlow />
      {/* greeting + nudge */}
      <div data-rise className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-mute mt-0.5">
            {role.label} ·{" "}
            <Link to={`/u/${user.username}`} className="hover:text-ink transition">
              proofly.app/u/{user.username}
            </Link>
          </p>
        </div>
        {nudge && (
          <div className="flex items-center gap-2.5 border border-amber-500/30 bg-amber-500/10 rounded-xl px-4 py-2.5">
            <Icon name="alert" size={15} className="text-amber-400" />
            <span className="text-sm text-amber-200/90">{nudge}</span>
          </div>
        )}
      </div>

      {/* hero stats */}
      <div data-rise className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-3">
        <Card className="col-span-2 md:col-span-1 flex items-center gap-4 !py-4 card-lift">
          <Icon name="flame" size={34} className="text-brand flame-pulse" />
          <div>
            <div className="text-2xl font-bold leading-none">
              <span data-count={summary.currentStreak}>{summary.currentStreak}</span>{" "}
              <span className="text-xs text-mute font-normal">day streak</span>
            </div>
            <div className="text-[11px] text-mute mt-1.5 flex items-center gap-1">
              longest {summary.longestStreak} ·
              <FreezeControl freezes={freezes} refresh={load} />
            </div>
          </div>
        </Card>
        <Card className="text-center !py-4 card-lift">
          <div className="text-2xl font-bold" data-count={summary.score}>{summary.score}</div>
          <div className="text-xs text-mute mt-1">score</div>
        </Card>
        <Card className="text-center !py-4 card-lift">
          <div className="text-2xl font-bold" data-count={summary.activeDays}>{summary.activeDays}</div>
          <div className="text-xs text-mute mt-1">active days</div>
        </Card>
        <Card className="text-center !py-4 card-lift">
          <div className="text-2xl font-bold text-green-400">{verifiedPct}%</div>
          <div className="text-xs text-mute mt-1">verified entries</div>
        </Card>
      </div>

      {/* heatmap — with a year filter built from the user's own data */}
      <Card data-rise>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h2 className="font-semibold text-sm">
            {hmYear
              ? `${heatmap.filter((d) => d.date.startsWith(hmYear) && d.total > 0).length} active days in ${hmYear}`
              : `${summary.totalContributions} contributions in the last year`}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={hmYear || ""}
              onChange={(e) => setHmYear(e.target.value || null)}
              className="bg-bg border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand transition cursor-pointer"
            >
              <option value="">Last 12 months</option>
              {(() => {
                const now = new Date().getFullYear();
                const dataYears = heatmap.map((d) => Number(d.date.slice(0, 4)));
                const min = Math.min(now - 4, ...(dataYears.length ? dataYears : [now]));
                const years = [];
                for (let y = now; y >= min; y--) years.push(String(y));
                return years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ));
              })()}
            </select>
            <Link to="/log">
              <Button className="!px-4 !py-1.5 text-xs">
                <Icon name="plus" size={13} /> Log today's work
              </Button>
            </Link>
          </div>
        </div>
        <Heatmap days={heatmap} accent={role.color} popDate={popDate} year={hmYear} />
      </Card>

      {/* this week + goals */}
      <div className="grid md:grid-cols-2 gap-3">
        <WeekCard data-rise insights={insights} role={role} />
        <GoalsCard data-rise goals={goals} role={role} refresh={load} />
      </div>

      {/* recent + achievements/integrations — the right stack sets the
          height, recent entries fills it and scrolls inside */}
      <div className="grid md:grid-cols-[1.5fr_1fr] gap-3">
        <div data-rise className="relative min-h-[420px]">
          <RecentCard
            recent={recent}
            role={role}
            refresh={load}
            filter={dateFilter}
            onFilter={setDateFilter}
          />
        </div>
        <div data-rise className="space-y-3">
          <Card>
            <h2 className="font-semibold text-sm mb-3">Achievements</h2>
            <div className="flex flex-wrap gap-1.5">
              {badges.filter((b) => b.earned).map((b) => (
                <span
                  key={b.key}
                  title={b.desc}
                  className="inline-flex items-center gap-1.5 text-xs border border-line bg-card2 rounded-full px-3 py-1.5"
                >
                  <Icon name={BADGE_ICONS[b.key] || "sparkles"} size={12} style={{ color: role.color }} />
                  {b.label}
                </span>
              ))}
              {badges.some((b) => !b.earned) && (
                <span
                  title={badges.filter((b) => !b.earned).map((b) => `${b.label} — ${b.desc}`).join("\n")}
                  className="inline-flex items-center gap-1.5 text-xs text-mute/60 bg-card2/50 rounded-full px-3 py-1.5"
                >
                  <Icon name="lock" size={11} /> {badges.filter((b) => !b.earned).length} locked
                </span>
              )}
            </div>
          </Card>
          {user.role === "developer" && (
            <GithubReposCard user={user} saveUser={saveUser} repos={repos} refresh={load} />
          )}
          <AccountCard user={user} saveUser={saveUser} />
          <ReportButton username={user.username} />
        </div>
      </div>
    </div>
  );
}

function WeekCard({ insights, role, ...rest }) {
  const { thisWeek, changePct, bestDay } = insights;
  const entries = Object.entries(thisWeek.metrics);
  return (
    <Card {...rest}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">This week</h2>
        {changePct !== null && (
          <span className={`text-xs font-semibold ${changePct >= 0 ? "text-green-400" : "text-red-400"}`}>
            {changePct >= 0 ? "+" : ""}{changePct}% vs last week
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-mute">Nothing logged yet this week — today's a good day to start.</p>
      ) : (
        <div className="flex gap-6 flex-wrap">
          {entries.map(([k, v]) => {
            const m = role.metrics.find((x) => x.key === k);
            if (!m) return null;
            return (
              <div key={k}>
                <div className="text-lg font-bold">{formatMetric(v, m.type)}</div>
                <div className="text-[11px] text-mute">{m.label.toLowerCase()}</div>
              </div>
            );
          })}
        </div>
      )}
      {bestDay && (
        <p className="text-xs text-mute mt-4 flex items-center gap-1.5">
          <Icon name="trophy" size={12} className="text-amber-400" />
          Best day ever: {prettyDate(bestDay.date)}
        </p>
      )}
    </Card>
  );
}

function GoalsCard({ goals, role, refresh, ...rest }) {
  const [adding, setAdding] = useState(false);
  const [metricKey, setMetricKey] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const free = role.metrics.filter((m) => !goals.some((g) => g.metricKey === m.key));

  async function save(e) {
    e.preventDefault();
    if (busy || !metricKey || !target) return;
    setBusy(true);
    try {
      await api.put("/goals", { metricKey, weeklyTarget: Number(target) });
      toast("Weekly goal saved — the bar starts filling now");
      setAdding(false);
      setMetricKey("");
      setTarget("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't save goal"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card {...rest}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-sm">Weekly goals</h2>
        {!adding && free.length > 0 && (
          <button onClick={() => setAdding(true)} className="text-xs text-brand hover:text-[#d0764c] transition">
            + add goal
          </button>
        )}
      </div>
      {goals.length === 0 && !adding && (
        <p className="text-sm text-mute">
          Set a weekly target — "{role.metrics[0].label.toLowerCase()}: 20/week" — and watch the bar fill.
        </p>
      )}
      <div className="space-y-3.5">
        {goals.map((g) => {
          const done = g.progress >= g.weeklyTarget;
          return (
            <div key={g.metricKey} className="group">
              <div className="flex justify-between text-xs mb-1.5">
                <span>{g.label}</span>
                <span className="flex items-center gap-2">
                  <span className={done ? "text-green-400" : "text-mute"}>
                    {g.progress} / {g.weeklyTarget}{done ? " done" : ""}
                  </span>
                  <button
                    onClick={() =>
                      api.delete(`/goals/${g.metricKey}`).then(() => {
                        toast("Goal removed");
                        refresh();
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 text-mute hover:text-red-400 transition"
                    title="Remove goal"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </span>
              </div>
              <div className="h-1.5 bg-line rounded-full">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${done ? "bg-green-500" : "bg-brand"}`}
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {adding && (
        <form onSubmit={save} className="flex gap-2 mt-4">
          <select
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
            className="flex-1 bg-bg border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand"
          >
            <option value="">metric…</option>
            {free.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            placeholder="per week"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-24 bg-bg border border-line rounded-lg px-2 py-1.5 text-xs outline-none focus:border-brand"
          />
          <Button className="!px-3 !py-1.5 text-xs" disabled={busy}>Save</Button>
        </form>
      )}
    </Card>
  );
}

function RecentCard({ recent, role, refresh, filter, onFilter, ...rest }) {
  const [proofFor, setProofFor] = useState(null);
  const [proofUrl, setProofUrl] = useState("");
  const today = localToday();
  const chips = [
    { label: "All", value: null },
    { label: "Today", value: today },
    { label: "Yesterday", value: addDays(today, -1) },
  ];

  async function attachProof(id) {
    if (!proofUrl.trim()) return;
    try {
      await api.put(`/contributions/${id}/evidence`, { evidenceUrl: proofUrl.trim() });
      toast("Proof attached — entry upgraded to Evidence");
      setProofFor(null);
      setProofUrl("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't attach proof"), "error");
    }
  }

  return (
    <Card {...rest} className="md:absolute md:inset-0 flex flex-col">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3 shrink-0">
        <h2 className="font-semibold text-sm">Recent entries</h2>
        <div className="flex items-center gap-1.5 flex-wrap">
          {chips.map((c) => (
            <button
              key={c.label}
              onClick={() => onFilter(c.value)}
              className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
                filter === c.value
                  ? "border-brand text-brand bg-brand/10"
                  : "border-line text-mute hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
          <input
            type="date"
            max={today}
            value={filter && !chips.some((c) => c.value === filter) ? filter : ""}
            onChange={(e) => onFilter(e.target.value || null)}
            className="bg-bg border border-line rounded-lg px-2 py-1 text-[11px] text-mute outline-none focus:border-brand transition w-[7.5rem]"
            title="Jump to a specific day"
          />
        </div>
      </div>
      {recent.length === 0 ? (
        filter ? (
          <p className="text-sm text-mute py-6 text-center">
            Nothing logged on {prettyDate(filter)}.
          </p>
        ) : (
          <Empty
            icon="sprout"
            title="No contributions yet"
            hint="Log your first day of work and watch your graph light up."
            action={<Link to="/log" className="mt-2"><Button>Log your first contribution</Button></Link>}
          />
        )
      ) : (
        <ul className="divide-y divide-line history-rail flex-1 min-h-0 max-h-[420px] md:max-h-none overflow-y-auto pr-1.5">
          {recent.map((c) => (
            <li key={c._id} className="py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm">
                    {Object.entries(c.metrics)
                      .map(([k, v]) => {
                        const m = role.metrics.find((x) => x.key === k);
                        return m ? `${formatMetric(v, m.type)} ${m.label}` : null;
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-[11px] text-mute">{prettyDate(c.date)}</span>
                    <VerificationBadge level={c.verification} />
                    {c.evidenceUrl && (
                      <a
                        href={c.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-brand hover:underline inline-flex items-center gap-1"
                      >
                        <Icon name="link" size={10} /> proof
                      </a>
                    )}
                    {c.verification === "self_reported" && proofFor !== c._id && (
                      <button
                        onClick={() => { setProofFor(c._id); setProofUrl(""); }}
                        className="text-[11px] text-mute hover:text-ink transition"
                      >
                        + add proof
                      </button>
                    )}
                  </div>
                  {c.note && <div className="text-xs text-mute mt-1 line-clamp-2">{c.note}</div>}
                </div>
                <button
                  onClick={() =>
                    api.delete(`/contributions/${c._id}`).then(() => {
                      toast("Entry deleted");
                      refresh();
                    })
                  }
                  className="text-mute hover:text-red-400 shrink-0 transition"
                  title="Delete entry"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
              {proofFor === c._id && (
                <div className="flex gap-2 mt-2">
                  <input
                    autoFocus
                    placeholder="https:// link to PR, campaign, design…"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && attachProof(c._id)}
                    className="flex-1 bg-bg border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                  />
                  <Button className="!px-3 !py-1.5 text-xs" onClick={() => attachProof(c._id)}>
                    Attach
                  </Button>
                  <button onClick={() => setProofFor(null)} className="text-xs text-mute hover:text-ink">
                    cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// Repo-based sync: paste repo links, we count your commits in each,
// refreshed daily. The optional username filters shared repos so
// only YOUR commits count.
function GithubReposCard({ user, saveUser, repos, refresh }) {
  const [repoInput, setRepoInput] = useState("");
  const [uname, setUname] = useState(user.githubUsername || "");
  const [busy, setBusy] = useState(false);

  function parseRepo(s) {
    const m = s.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    return (m ? `${m[1]}/${m[2]}` : s.trim()).replace(/\.git$/, "");
  }

  async function addRepo(e) {
    e.preventDefault();
    const repo = parseRepo(repoInput);
    if (busy || !repo) return;
    setBusy(true);
    try {
      const r = await api.post("/connections", { type: "github_repo", repo });
      toast(`${repo} connected — synced ${r.data.synced} days of commits`);
      setRepoInput("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't connect repo"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function syncRepo(c) {
    try {
      const r = await api.post(`/connections/${c._id}/sync`);
      toast(`${c.label} — synced ${r.data.synced} days`);
      refresh();
    } catch (err) {
      toast(errMsg(err, "Sync failed"), "error");
    }
  }

  async function removeRepo(c) {
    if (!window.confirm(`Disconnect ${c.label}? Its synced entries are removed too.`)) return;
    await api.delete(`/connections/${c._id}`);
    toast(`${c.label} disconnected`, "info");
    refresh();
  }

  async function saveUname() {
    const v = uname.trim();
    if (busy || !v || v === user.githubUsername) return;
    setBusy(true);
    try {
      const r = await api.put("/integrations/github", { username: v });
      saveUser({ ...user, githubUsername: r.data.githubUsername });
      toast(
        r.data.resynced
          ? `Saved — ${r.data.resynced} repo${r.data.resynced > 1 ? "s" : ""} re-synced with @${v}'s commits`
          : `Username saved — shared repos now count only @${v}'s commits`
      );
      if (r.data.resynced) refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't save username"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold text-sm mb-1.5 flex items-center gap-2">
        <Icon name="github" size={14} /> GitHub repos
      </h2>
      <p className="text-[11px] text-mute mb-3">
        Paste a public repo — commits in it become verified entries, refreshed daily.
      </p>
      <form onSubmit={addRepo} className="flex gap-2">
        <input
          placeholder="github.com/you/repo or owner/repo"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand transition"
        />
        <Button className="!px-3 !py-1.5 text-xs" disabled={busy}>
          {busy ? "…" : "Add"}
        </Button>
      </form>
      {repos.length > 0 && (
        <div className="space-y-1.5 mt-3">
          {repos.map((c) => (
            <div
              key={c._id}
              className="flex items-center gap-2 text-xs bg-bg border border-line rounded-lg px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
              <span className="text-mute shrink-0">{c.lastSynced}d</span>
              <button onClick={() => syncRepo(c)} className="text-mute hover:text-ink transition" title="Sync now">
                <Icon name="refresh" size={12} />
              </button>
              <button onClick={() => removeRepo(c)} className="text-mute hover:text-red-400 transition" title="Disconnect">
                <Icon name="x" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="block mt-3">
        <span className="block text-[11px] text-mute mb-1">
          Your GitHub username — in shared repos only your commits count
        </span>
        <input
          placeholder="your-username"
          value={uname}
          onChange={(e) => setUname(e.target.value)}
          onBlur={saveUname}
          onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          className="w-full bg-bg border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand transition"
        />
      </label>
    </Card>
  );
}

// "N freezes left" — click to spend one on a missed day (last 7 days)
function FreezeControl({ freezes, refresh }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(addDays(localToday(), -1));
  const [busy, setBusy] = useState(false);
  const today = localToday();

  async function freeze() {
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/users/streak-freeze", { date });
      toast(`${prettyDate(date)} frozen — streak protected`);
      setOpen(false);
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't freeze that day"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => freezes.remaining > 0 && setOpen(true)}
        disabled={freezes.remaining === 0}
        className="inline-flex items-center gap-1 hover:text-blue-300 transition disabled:cursor-default"
        title={freezes.remaining > 0 ? "Freeze a missed day" : "No freezes left this month"}
      >
        <Icon name="snowflake" size={11} className="text-blue-400" />
        {freezes.remaining} freezes left
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-line rounded-2xl w-full max-w-sm p-6 pop-in"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-bold flex items-center gap-2 mb-1.5">
              <Icon name="snowflake" size={15} className="text-blue-400" /> Freeze a missed day
            </h3>
            <p className="text-xs text-mute mb-4">
              A freeze bridges one missed day so it doesn't break your streak. You get 2 per
              month — it adds no activity, just protection.
            </p>
            <input
              type="date"
              value={date}
              min={addDays(today, -7)}
              max={addDays(today, -1)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="text-xs text-mute hover:text-ink px-2">
                Cancel
              </button>
              <Button className="!px-4 !py-2 text-xs" onClick={freeze} disabled={busy}>
                {busy ? "Freezing…" : "Use a freeze"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// headline, email reminders, password, data takeout — account stuff
function AccountCard({ user, saveUser }) {
  const [headline, setHeadline] = useState(user.headline || "");
  const [reminders, setReminders] = useState(user.emailReminders !== false);
  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveHeadline() {
    if (busy || headline === (user.headline || "")) return;
    setBusy(true);
    try {
      const r = await api.put("/users/profile", { headline });
      saveUser(r.data.user);
      toast("Headline updated");
    } catch (err) {
      toast(errMsg(err, "Couldn't save headline"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReminders() {
    const next = !reminders;
    setReminders(next);
    try {
      const r = await api.put("/users/profile", { emailReminders: next });
      saveUser(r.data.user);
      toast(next ? "Streak reminder emails on" : "Reminder emails off", "info");
    } catch {
      setReminders(!next);
      toast("Couldn't update reminders", "error");
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/auth/change-password", { currentPassword: curPw, newPassword: newPw });
      toast("Password changed");
      setShowPw(false);
      setCurPw("");
      setNewPw("");
    } catch (err) {
      toast(errMsg(err, "Couldn't change password"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Icon name="user" size={14} /> Account
      </h2>
      <div className="space-y-3 text-xs">
        <div>
          <span className="block text-mute mb-1.5">Headline (shows on your public profile)</span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            onBlur={saveHeadline}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            maxLength={120}
            placeholder="Full-stack developer, ships daily"
            className="w-full bg-bg border border-line rounded-lg px-2.5 py-2 outline-none focus:border-brand transition"
          />
        </div>
        <button onClick={toggleReminders} className="flex items-center justify-between w-full group">
          <span className="text-mute group-hover:text-ink transition">Streak reminder emails</span>
          <span
            className={`w-8 h-[18px] rounded-full relative transition ${
              reminders ? "bg-brand" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-ink transition-all ${
                reminders ? "left-[18px]" : "left-[2px]"
              }`}
            />
          </span>
        </button>
        {showPw ? (
          <form onSubmit={changePassword} className="space-y-2">
            <input
              type="password"
              placeholder="current password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-2.5 py-2 outline-none focus:border-brand transition"
            />
            <input
              type="password"
              placeholder="new password (6+ characters)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full bg-bg border border-line rounded-lg px-2.5 py-2 outline-none focus:border-brand transition"
            />
            <div className="flex gap-2">
              <Button className="!px-3 !py-1.5 text-xs" disabled={busy || newPw.length < 6}>
                {busy ? "Saving…" : "Change password"}
              </Button>
              <button type="button" onClick={() => setShowPw(false)} className="text-mute hover:text-ink">
                cancel
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowPw(true)} className="text-mute hover:text-ink transition inline-flex items-center gap-1.5">
            <Icon name="lock" size={11} /> Change password
          </button>
        )}
      </div>
    </Card>
  );
}

// click -> pick a format: the recruiter-facing HTML report or the
// CSV tracker template (for the sheet connection)
function ReportButton({ username }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const options = [
    {
      label: "Proof-of-work report",
      hint: "HTML — open anywhere, print to PDF",
      icon: "file-text",
      ep: "/export/profile",
      fname: `proofly-${username}.html`,
      done: "Report downloaded — open it or print to PDF",
    },
    {
      label: "CSV tracker template",
      hint: "for your Google Sheet connection",
      icon: "table",
      ep: "/connections/sheet-template",
      fname: "proofly-tracker.csv",
      done: "Template downloaded — import it into Google Sheets",
    },
  ];

  async function download(opt) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.get(opt.ep, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = Object.assign(document.createElement("a"), { href: url, download: opt.fname });
      a.click();
      URL.revokeObjectURL(url);
      toast(opt.done);
      setOpen(false);
    } catch (err) {
      toast(errMsg(err, "Download failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full border border-line rounded-2xl bg-card py-3 text-sm text-mute hover:text-ink hover:border-brand transition inline-flex items-center justify-center gap-2"
      >
        <Icon name="download" size={14} />
        Download proof-of-work
        <Icon name="plus" size={11} className={`transition-transform ${open ? "rotate-45" : ""}`} />
      </button>
      {open && (
        <div className="pop-in mt-2 space-y-1.5">
          {options.map((opt) => (
            <button
              key={opt.ep}
              onClick={() => download(opt)}
              disabled={busy}
              className="w-full text-left border border-line rounded-xl bg-card px-3.5 py-2.5 hover:border-brand transition disabled:opacity-50 flex items-center gap-2.5"
            >
              <Icon name={opt.icon} size={14} className="text-brand shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs font-medium">{opt.label}</span>
                <span className="block text-[10.5px] text-mute">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
