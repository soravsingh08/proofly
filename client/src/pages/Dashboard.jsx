import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import Heatmap from "../components/Heatmap";
import {
  Card, StatCard, StreakBadge, VerificationBadge, Spinner, Empty, Button,
} from "../components/ui";
import { prettyDate } from "../utils/dates";
import { formatMetric } from "../config/roles";
import { Icon } from "../components/icons";

export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = ROLES[user.role];
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  // when LogActivity navigates back, it passes the logged date so
  // the new heatmap square pops (the applause moment)
  const popDate = location.state?.popDate || null;

  useEffect(() => {
    Promise.all([
      api.get("/stats/summary"),
      api.get("/stats/heatmap"),
      api.get("/contributions?limit=8"),
    ])
      .then(([s, h, c]) =>
        setData({
          summary: s.data.summary,
          heatmap: h.data.days,
          recent: c.data.contributions,
        })
      )
      .catch(() => setError(true));
  }, []);

  if (error)
    return <Empty icon="alert" title="Couldn't load your dashboard" hint="Is the API running?" />;
  if (!data) return <Spinner label="Loading your proof-of-work…" />;

  const { summary, heatmap, recent } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* header row: identity + streak (streak is the hero number) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-lg border flex items-center justify-center"
              style={{ borderColor: `${role.color}55`, background: `${role.color}1a`, color: role.color }}
            >
              <Icon name={role.icon} size={18} />
            </span>
            {user.name}
          </h1>
          <p className="text-sm text-mute">
            {role.label} · Score{" "}
            <span className="font-semibold" style={{ color: role.color }}>
              {summary.score}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StreakBadge streak={summary.currentStreak} />
          <Link to="/log">
            <Button>
              <Icon name="plus" size={14} /> Log today's work
            </Button>
          </Link>
        </div>
      </div>

      {/* heatmap */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {summary.totalContributions} contributions in the last year
          </h2>
          <span className="text-xs text-mute">
            Longest streak: {summary.longestStreak} days · {summary.activeDays} active days
          </span>
        </div>
        <Heatmap days={heatmap} accent={role.color} popDate={popDate} />
      </Card>

      {/* metric totals */}
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

      {/* recent activity */}
      <Card>
        <h2 className="font-semibold text-sm mb-4">Recent activity</h2>
        {recent.length === 0 ? (
          <Empty
            icon="sprout"
            title="No contributions yet"
            hint="Log your first day of work and watch your graph light up."
            action={
              <Link to="/log" className="mt-2"><Button>Log your first contribution</Button></Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((c) => (
              <li key={c._id} className="py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
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
                </div>
                <button
                  onClick={async () => {
                    await api.delete(`/contributions/${c._id}`);
                    navigate(0);
                  }}
                  className="text-xs text-mute hover:text-red-400 shrink-0"
                  title="Delete entry"
                >
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
