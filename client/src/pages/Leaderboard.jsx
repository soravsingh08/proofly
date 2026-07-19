import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Card, Spinner, Empty } from "../components/ui";
import { Icon } from "../components/icons";

const MEDALS = ["#e8b923", "#b8bcc4", "#c98a56"];

const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Avatar({ name, color, size = "w-9 h-9 text-xs" }) {
  return (
    <div
      className={`${size} rounded-full border flex items-center justify-center font-semibold shrink-0`}
      style={{ color, borderColor: `${color}55`, background: `${color}1a` }}
    >
      {initials(name)}
    </div>
  );
}

// Top-3 podium — champion centered and elevated on desktop
function Podium({ top, color, me }) {
  const order = ["md:order-2", "md:order-1", "md:order-3"];
  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6 items-end">
      {top.map((r, i) => (
        <Link
          key={r.username}
          to={`/u/${r.username}`}
          className={`${order[i]} ${i === 0 ? "order-first md:order-2" : ""} group`}
        >
          <div
            className={`relative bg-card border rounded-2xl p-5 text-center transition group-hover:border-mute/50 ${
              me === r.username ? "border-brand/60" : "border-line"
            } ${i === 0 ? "md:pb-8 shadow-2xl shadow-black/40" : ""}`}
          >
            <div
              className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
              style={{
                background: `linear-gradient(90deg, transparent, ${MEDALS[i]}, transparent)`,
              }}
            />
            <div className="flex justify-center mb-3">
              <Icon name="trophy" size={i === 0 ? 20 : 15} style={{ color: MEDALS[i] }} />
            </div>
            <div className="flex justify-center mb-3">
              <Avatar
                name={r.name}
                color={color}
                size={i === 0 ? "w-14 h-14 text-base" : "w-11 h-11 text-sm"}
              />
            </div>
            <div className="font-semibold text-sm truncate">{r.name}</div>
            <div className="text-xs text-mute truncate">@{r.username}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-orange-400 font-semibold">
              <Icon name="flame" size={14} />
              {r.currentStreak}
              <span className="text-[10px] font-normal text-mute">day streak</span>
            </div>
            <div className="text-[11px] text-mute mt-1.5">
              {r.activeDays} active days · longest {r.longestStreak}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

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

  const color = ROLES[role].color;
  const top = rows?.slice(0, 3) || [];
  const rest = rows?.slice(3) || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-sm text-mute mb-6">
        Ranked by consistency — you can't fake showing up every day.
      </p>

      {/* role tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
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
        <>
          <Podium top={top} color={color} me={user?.username} />

          {rest.length > 0 && (
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
                  {rest.map((r, i) => (
                    <tr
                      key={r.username}
                      className={`border-b border-line last:border-0 hover:bg-card2 transition ${
                        user?.username === r.username ? "bg-card2" : ""
                      }`}
                    >
                      <td className="px-4 py-3 w-10 text-mute">{i + 4}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/u/${r.username}`}
                          className="flex items-center gap-3 hover:underline"
                        >
                          <Avatar name={r.name} color={color} />
                          <span className="min-w-0">
                            <span className="font-medium">{r.name}</span>{" "}
                            <span className="text-mute text-xs">@{r.username}</span>
                            {r.headline && (
                              <span className="block text-xs text-mute line-clamp-1 no-underline">
                                {r.headline}
                              </span>
                            )}
                          </span>
                        </Link>
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
        </>
      )}
    </div>
  );
}
