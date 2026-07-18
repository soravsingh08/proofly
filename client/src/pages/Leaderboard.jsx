import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Card, Spinner, Empty } from "../components/ui";
import { Icon } from "../components/icons";

// Per-role only, streak-ranked — "we rank consistency, not claims"
export default function Leaderboard() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role || "developer");
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    api
      .get(`/leaderboard?role=${role}`)
      .then((r) => setRows(r.data.leaderboard))
      .catch(() => setRows([]));
  }, [role]);

  const medalColor = ["#e8b923", "#b8bcc4", "#c98a56"];
  const medal = (i) =>
    i < 3 ? (
      <Icon name="trophy" size={15} style={{ color: medalColor[i] }} />
    ) : (
      `${i + 1}`
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-sm text-mute mb-6">
        Ranked by consistency — you can't fake showing up every day.
      </p>

      {/* role tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setRole(k)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
              role === k
                ? "text-black font-semibold"
                : "border-line text-mute hover:text-ink"
            }`}
            style={role === k ? { background: ROLES[k].color, borderColor: ROLES[k].color } : {}}
          >
            <Icon name={ROLES[k].icon} size={12} /> {ROLES[k].label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon="trophy"
          title="No one here yet"
          hint="Claim the #1 spot — start logging your work."
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-mute border-b border-line">
                <th className="text-left font-medium px-4 py-3">#</th>
                <th className="text-left font-medium px-4 py-3">Professional</th>
                <th className="text-right font-medium px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="flame" size={11} className="text-orange-400" /> Streak
                  </span>
                </th>
                <th className="text-right font-medium px-4 py-3">Active days</th>
                <th className="text-right font-medium px-4 py-3 hidden sm:table-cell">Longest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.username}
                  className={`border-b border-line last:border-0 hover:bg-card2 transition ${
                    user?.username === r.username ? "bg-card2" : ""
                  }`}
                >
                  <td className="px-4 py-3 w-10">{medal(i)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/u/${r.username}`} className="hover:underline">
                      <span className="font-medium">{r.name}</span>{" "}
                      <span className="text-mute text-xs">@{r.username}</span>
                    </Link>
                    {r.headline && (
                      <div className="text-xs text-mute line-clamp-1">{r.headline}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-400">
                    {r.currentStreak}
                  </td>
                  <td className="px-4 py-3 text-right">{r.activeDays}</td>
                  <td className="px-4 py-3 text-right text-mute hidden sm:table-cell">
                    {r.longestStreak}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
