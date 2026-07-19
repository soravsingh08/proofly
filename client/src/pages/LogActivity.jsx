import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, formatMetric } from "../config/roles";
import { AmbientGlow, Button, Card, Input, VerificationBadge } from "../components/ui";
import { Icon } from "../components/icons";
import { toast } from "../components/toast";
import { addDays, localToday, prettyDate } from "../utils/dates";

// step size per metric type — counts go 1 by 1, money 100 by 100
const STEP = { count: 1, currency: 100, percent: 0.5, ratio: 0.5 };

const SOURCE_LABELS = {
  manual: "Logged manually",
  excel_import: "Imported from Excel report",
  github_sync: "Synced from GitHub",
  meta_api: "Synced from Meta Ads API",
  connection: "Auto-synced from a connection",
  seed: "Demo data",
};

export default function LogActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = ROLES[user.role];
  const today = localToday();
  const rootRef = useRef(null);

  const [date, setDate] = useState(today);
  const [values, setValues] = useState({});
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [context, setContext] = useState(null); // streak + goals
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  const loadHistory = useCallback(() => {
    api.get("/contributions?limit=15").then((r) => setHistory(r.data.contributions)).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([api.get("/stats/insights"), api.get("/goals")])
      .then(([i, g]) => setContext({ insights: i.data, goals: g.data.goals }))
      .catch(() => {});
    loadHistory();
  }, [loadHistory]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  function bump(key, type, dir) {
    const step = STEP[type] || 1;
    const cur = Number(values[key]) || 0;
    const next = Math.max(0, +(cur + dir * step).toFixed(1));
    setValues({ ...values, [key]: next || "" });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return; // double-click guard (B8)
    const metrics = {};
    for (const [k, v] of Object.entries(values)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) metrics[k] = n;
    }
    if (Object.keys(metrics).length === 0) {
      setError("Log at least one metric, zeros don't count.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/contributions", { date, metrics, note, evidenceUrl });
      toast(`Contribution saved — ${prettyDate(date)} is on the graph`);
      // pass logged date so the dashboard pops that square
      navigate("/dashboard", { state: { popDate: date } });
    } catch (err) {
      setError(errMsg(err, "Could not save"));
      setBusy(false);
    }
  }

  const insights = context?.insights;
  const goalFor = (key) => context?.goals.find((g) => g.metricKey === key);

  return (
    <div ref={rootRef} className="relative max-w-5xl mx-auto px-4 py-10">
      <AmbientGlow />
      <div data-rise>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2.5">
          <span style={{ color: role.color }}>
            <Icon name={role.icon} size={20} />
          </span>
          Log your work
        </h1>
        <p className="text-sm text-mute mb-5">
          {role.label} · every day you log builds your public proof.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div>
          {insights && insights.currentStreak > 0 && (
            <div
              data-rise
              className="flex items-center gap-2.5 border border-line bg-card rounded-xl px-4 py-2.5 mb-4 text-sm"
            >
              <Icon name="flame" size={15} className="text-brand" />
              {insights.daysSinceLastLog === 0 ? (
                <span className="text-mute">
                  <span className="text-ink font-medium">{insights.currentStreak}-day streak</span> — today's
                  already logged, stack more on top.
                </span>
              ) : (
                <span className="text-mute">
                  Logging today keeps your{" "}
                  <span className="text-ink font-medium">{insights.currentStreak}-day streak</span> alive.
                </span>
              )}
            </div>
          )}

          <Card data-rise>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {[
                    { label: "Today", d: today },
                    { label: "Yesterday", d: addDays(today, -1) },
                  ].map(({ label, d }) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDate(d)}
                      className={`text-xs rounded-full px-3 py-1.5 border transition ${
                        date === d
                          ? "border-brand text-brand bg-brand/10"
                          : "border-line text-mute hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="text-xs text-mute ml-auto">{prettyDate(date)}</span>
                </div>
                <Input
                  type="date"
                  value={date}
                  min={addDays(today, -30)}
                  max={today}
                  required
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {role.metrics.map((m) => {
                  const goal = goalFor(m.key);
                  const unit =
                    m.type === "currency" ? " (₹)" : m.type === "percent" ? " (%)" : m.type === "ratio" ? " (x)" : "";
                  return (
                    <div key={m.key} className="border border-line rounded-xl p-3 bg-bg">
                      <div className="text-xs text-mute mb-2">{m.label + unit}</div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => bump(m.key, m.type, -1)}
                          className="w-7 h-7 shrink-0 rounded-lg border border-line text-mute hover:text-ink hover:border-brand transition"
                          aria-label={`decrease ${m.label}`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          step={m.type === "count" ? "1" : "0.1"}
                          placeholder="0"
                          value={values[m.key] ?? ""}
                          onChange={(e) => setValues({ ...values, [m.key]: e.target.value })}
                          className="w-full min-w-0 bg-transparent text-center text-lg font-semibold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => bump(m.key, m.type, 1)}
                          className="w-7 h-7 shrink-0 rounded-lg border border-line text-mute hover:text-ink hover:border-brand transition"
                          aria-label={`increase ${m.label}`}
                        >
                          +
                        </button>
                      </div>
                      {goal && (
                        <div className="text-[10px] text-mute mt-2 text-center">
                          goal: {goal.progress} / {goal.weeklyTarget} this week
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className="block">
                <span className="text-xs text-mute mb-1.5 flex items-center gap-1.5">
                  <Icon name="paperclip" size={11} /> Proof link (optional)
                </span>
                <input
                  placeholder="https:// PR, live campaign, design, report…"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
                />
                <span className="block text-[11px] text-mute mt-1.5">
                  Entries with a link show as <span className="text-amber-300">Evidence</span> — recruiters
                  trust proof over claims.
                </span>
              </label>

              <label className="block">
                <span className="block text-xs text-mute mb-1.5">
                  Note (optional, {280 - note.length} left)
                </span>
                <textarea
                  className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition resize-none"
                  rows={2}
                  maxLength={280}
                  placeholder="What did you work on?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Save contribution"}
              </Button>
            </form>
          </Card>
        </div>

        {/* history rail — exactly as tall as the form column, scrolls inside */}
        <div data-rise className="relative">
          <div className="lg:absolute lg:inset-0 flex flex-col">
          <h2 className="text-sm font-semibold px-1 mb-2 shrink-0">Your recent logs</h2>
          <div className="history-rail space-y-2 flex-1 min-h-0 max-h-[60vh] lg:max-h-none overflow-y-auto pr-1.5">
          {history.length === 0 ? (
            <p className="text-xs text-mute px-1">
              Nothing yet — your first log will show up here.
            </p>
          ) : (
            history.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelected(c)}
                className="w-full text-left bg-card border border-line rounded-xl px-3.5 py-3 hover:border-brand/50 hover:-translate-y-px transition group"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] text-mute">{prettyDate(c.date)}</span>
                  <VerificationBadge level={c.verification} />
                </div>
                <div className="text-xs leading-relaxed">
                  {Object.entries(c.metrics)
                    .map(([k, v]) => {
                      const m = role.metrics.find((x) => x.key === k);
                      return m ? `${formatMetric(v, m.type)} ${m.label}` : null;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {c.note && (
                  <div className="text-[11px] text-mute mt-1 truncate">{c.note}</div>
                )}
                <div className="text-[10px] text-brand opacity-0 group-hover:opacity-100 transition mt-1">
                  view details →
                </div>
              </button>
            ))
          )}
          </div>
          </div>
        </div>
      </div>

      {selected && (
        <LogDetail
          entry={selected}
          role={role}
          onClose={() => setSelected(null)}
          refresh={loadHistory}
        />
      )}
    </div>
  );
}

// Full-detail popup for one logged activity — everything we know
// about the entry, plus attach-proof and delete.
function LogDetail({ entry, role, onClose, refresh }) {
  const [proofUrl, setProofUrl] = useState("");
  const [addingProof, setAddingProof] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  async function attachProof() {
    if (busy || !proofUrl.trim()) return;
    setBusy(true);
    try {
      await api.put(`/contributions/${entry._id}/evidence`, { evidenceUrl: proofUrl.trim() });
      toast("Proof attached — entry upgraded to Evidence");
      refresh();
      onClose();
    } catch (err) {
      toast(errMsg(err, "Couldn't attach proof"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !window.confirm("Delete this entry? The heatmap square goes with it.")) return;
    setBusy(true);
    try {
      await api.delete(`/contributions/${entry._id}`);
      toast("Entry deleted");
      refresh();
      onClose();
    } catch (err) {
      toast(errMsg(err, "Couldn't delete"), "error");
    } finally {
      setBusy(false);
    }
  }

  const loggedAt = new Date(entry.createdAt).toLocaleString("en", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-card border border-line rounded-2xl w-full max-w-md p-6 pop-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">{prettyDate(entry.date)}</h3>
            <div className="flex items-center gap-2 mt-1.5">
              <VerificationBadge level={entry.verification} />
              <span className="text-[11px] text-mute">{SOURCE_LABELS[entry.source] || entry.source}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink transition" aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {Object.entries(entry.metrics).map(([k, v]) => {
            const m = role.metrics.find((x) => x.key === k);
            if (!m) return null;
            return (
              <div key={k} className="bg-bg border border-line rounded-xl p-3 text-center">
                <div className="text-xl font-bold" style={{ color: role.color }}>
                  {formatMetric(v, m.type)}
                </div>
                <div className="text-[11px] text-mute mt-0.5">{m.label}</div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-mute space-y-2.5">
          <div className="flex items-center gap-2">
            <Icon name="zap" size={12} className="text-brand" />
            <span>
              <span className="text-ink font-medium">{entry.weightedTotal} impact points</span> — drives
              your heatmap intensity and score
            </span>
          </div>
          {entry.note && (
            <div className="flex items-start gap-2">
              <Icon name="file-text" size={12} className="mt-0.5" />
              <span className="text-ink/90">{entry.note}</span>
            </div>
          )}
          {entry.evidenceUrl && (
            <div className="flex items-center gap-2">
              <Icon name="paperclip" size={12} className="text-amber-300" />
              <a
                href={entry.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline truncate"
              >
                {entry.evidenceUrl}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Icon name="pencil" size={12} />
            <span>Logged {loggedAt}</span>
          </div>
        </div>

        {entry.verification === "self_reported" && (
          <div className="mt-4">
            {addingProof ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="https:// link to proof"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && attachProof()}
                  className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                />
                <Button className="!px-3 !py-1.5 text-xs" onClick={attachProof} disabled={busy}>
                  Attach
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setAddingProof(true)}
                className="w-full border border-line rounded-lg py-2 text-xs text-mute hover:text-ink hover:border-brand transition inline-flex items-center justify-center gap-1.5"
              >
                <Icon name="paperclip" size={11} /> Add proof — upgrade to Evidence
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4 pt-3 border-t border-line">
          <button
            onClick={remove}
            disabled={busy}
            className="text-xs text-mute hover:text-red-400 transition inline-flex items-center gap-1.5"
          >
            <Icon name="x" size={11} /> Delete entry
          </button>
        </div>
      </div>
    </div>
  );
}
