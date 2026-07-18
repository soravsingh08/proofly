import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/icons";
import { ROLES, formatMetric } from "../config/roles";
import Heatmap from "../components/Heatmap";
import {
  Card, StatCard, StreakBadge, VerificationBadge, Spinner, Empty, Button, Input,
} from "../components/ui";
import { prettyDate } from "../utils/dates";

// THE demo centerpiece — what a recruiter sees. No auth needed.
export default function PublicProfile() {
  const { username } = useParams();
  const { user, saveUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    api
      .get(`/public/${username}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true));
  }, [username]);

  // the 404-claim page is a growth feature (F1)
  if (notFound)
    return (
      <Empty
        icon="user"
        title={`@${username} doesn't exist yet`}
        hint="This profile is unclaimed. Start building your proof-of-work today."
        action={
          <Link to="/register" className="mt-2">
            <Button>Claim @{username}</Button>
          </Link>
        }
      />
    );
  if (!data) return <Spinner label="Loading profile…" />;

  const { profile, summary, heatmap, recent } = data;
  const role = ROLES[profile.role];
  const isOwn = user?.username === profile.username;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* identity header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center border-2"
            style={{ borderColor: role.color, background: `${role.color}22`, color: role.color }}
          >
            <Icon name={role.icon} size={26} strokeWidth={1.6} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <p className="text-sm text-mute">
              @{profile.username} ·{" "}
              <span style={{ color: role.color }}>{role.label}</span>
            </p>
            {profile.headline && (
              <p className="text-sm mt-1">{profile.headline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <StreakBadge streak={summary.currentStreak} />
          <button
            onClick={() => navigate(`/u/${profile.username}/resume`)}
            className="inline-flex items-center gap-1.5 text-xs border border-line rounded-lg px-3 py-2 text-mute hover:text-ink hover:border-mute transition"
            title="Recruiter-ready résumé built from this proof"
          >
            <Icon name="download" size={13} /> Résumé
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs border border-line rounded-lg px-3 py-2 text-mute hover:text-ink hover:border-mute transition"
              >
                <Icon name="pencil" size={13} /> Edit profile
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 text-xs border border-line rounded-lg px-3 py-2 text-mute hover:text-ink hover:border-mute transition"
              >
                <Icon name={copied ? "check" : "link"} size={13} />
                {copied ? "Copied!" : "Copy link"}
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={(u) => {
            saveUser(u);
            setData({
              ...data,
              profile: { ...profile, name: u.name, headline: u.headline },
            });
            setEditing(false);
          }}
        />
      )}

      {/* AI career summary — the model reads proof, not promises */}
      <AiSummaryCard
        aiSummary={data.aiSummary}
        isOwn={isOwn}
        accent={role.color}
        onGenerated={(aiSummary) => setData({ ...data, aiSummary })}
      />

      {/* proof graph */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {summary.totalContributions} contributions in the last year
          </h2>
          <span className="text-xs text-mute">
            Score {summary.score} · longest streak {summary.longestStreak} days
          </span>
        </div>
        <Heatmap days={heatmap} accent={role.color} />
      </Card>

      {/* lifetime numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {role.metrics.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={summary.metricTotals[m.key]}
            type={m.type}
            accent={role.color}
          />
        ))}
      </div>

      {/* recent proof entries */}
      <Card>
        <h2 className="font-semibold text-sm mb-4">Recent proof</h2>
        {recent.length === 0 ? (
          <Empty icon="sprout" title="No contributions yet" />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((c, i) => (
              <li key={i} className="py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-mute">{prettyDate(c.date)}</span>
                  <VerificationBadge level={c.verification} />
                </div>
                <div className="text-sm mt-1">
                  {Object.entries(c.metrics)
                    .map(([k, v]) => {
                      const m = role.metrics.find((x) => x.key === k);
                      return m ? `${formatMetric(v, m.type)} ${m.label}` : null;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {c.note && (
                  <div className="text-xs text-mute mt-0.5 line-clamp-2">{c.note}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-center text-xs text-mute pb-6">
        Proof-of-work profile powered by <span className="text-ink font-semibold">Proofly</span> —
        consistency you can't fake.
      </p>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/users/profile", { name, headline });
      onSaved(r.data.user);
    } catch (err) {
      setError(errMsg(err, "Couldn't save profile"));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-line rounded-2xl p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Edit profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-mute hover:text-ink transition"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        <Input
          label="Headline — one line recruiters see first"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={120}
          placeholder="e.g. Performance marketer · ₹2Cr ad spend managed"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-sm border border-line rounded-lg px-4 py-2 text-mute hover:text-ink hover:border-mute transition"
          >
            Cancel
          </button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AiSummaryCard({ aiSummary, isOwn, accent, onGenerated }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // nothing generated yet and viewer isn't the owner -> show nothing
  if (!aiSummary && !isOwn) return null;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/ai/summary");
      onGenerated(r.data.aiSummary);
    } catch (err) {
      setError(errMsg(err, "AI generation failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="sparkles" size={14} className="text-brand" /> AI Career Summary
          <span className="text-[10px] font-normal text-mute border border-line rounded-full px-2 py-0.5">
            generated from logged proof
          </span>
        </h2>
        {isOwn && (
          <button
            onClick={generate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs border border-line rounded-lg px-3 py-1.5 text-mute hover:text-ink hover:border-mute transition disabled:opacity-50"
          >
            <Icon name={aiSummary ? "refresh" : "sparkles"} size={12} />
            {busy ? "Reading your proof…" : aiSummary ? "Regenerate" : "Generate"}
          </button>
        )}
      </div>

      {aiSummary ? (
        <>
          <p className="text-sm leading-relaxed">{aiSummary.text}</p>
          {aiSummary.highlights?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {aiSummary.highlights.map((h, i) => (
                <span
                  key={i}
                  className="text-xs rounded-full px-3 py-1 border"
                  style={{ borderColor: `${accent}66`, background: `${accent}14`, color: accent }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-mute">
          Let AI turn your contribution history into a recruiter-ready summary —
          built from your logged metrics, not self-description.
        </p>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </Card>
  );
}
