import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, formatMetric } from "../config/roles";
import Heatmap from "../components/Heatmap";
import {
  Card, StatCard, StreakBadge, VerificationBadge, Spinner, Empty, Button,
} from "../components/ui";
import { prettyDate } from "../utils/dates";

// THE demo centerpiece — what a recruiter sees. No auth needed.
export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

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
        icon="🪪"
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
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl border-2"
            style={{ borderColor: role.color, background: `${role.color}22` }}
          >
            {role.icon}
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
        <div className="flex items-center gap-3">
          <StreakBadge streak={summary.currentStreak} />
          {isOwn && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-xs border border-line rounded-lg px-3 py-2 text-mute hover:text-ink hover:border-mute transition"
            >
              {copied ? "✓ Copied!" : "🔗 Copy profile link"}
            </button>
          )}
        </div>
      </div>

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
          <Empty icon="🌱" title="No contributions yet" />
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
