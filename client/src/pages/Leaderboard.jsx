import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Card, Spinner, Empty, SketchLine } from "../components/ui";
import { Icon } from "../components/icons";

const MEDALS = ["var(--medal-1)", "var(--medal-2)", "var(--medal-3)"];
const STREAK_CHIPS = [
  { label: "Any streak", value: 0 },
  { label: "7+", value: 7 },
  { label: "30+", value: 30 },
  { label: "100+", value: 100 },
];

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// gradient "profile photo" built from the role color
function Avatar({ name, color, medal, className = "" }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 55%, #000) 100%)`,
        boxShadow: medal
          ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${medal}`
          : undefined,
      }}
    >
      {initials(name)}
    </div>
  );
}

// Per-role, streak-ranked — "we rank consistency, not claims".
// Search + streak filters run on the backend (/public/search).
export default function Leaderboard() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role || "developer");
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [minStreak, setMinStreak] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const searching = q.trim() !== "" || minStreak > 0;

  useEffect(() => {
    setRows(null);
    const ep = searching
      ? `/public/search?role=${role}&q=${encodeURIComponent(q.trim())}&minStreak=${minStreak}`
      : `/leaderboard?role=${role}`;
    // small debounce so typing doesn't spam the API
    const t = setTimeout(
      () =>
        api
          .get(ep)
          .then((r) => setRows(r.data.leaderboard || r.data.results))
          .catch(() => setRows([])),
      q.trim() ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [role, q, minStreak, searching]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // board rebuilds with motion on every role/filter switch
  useLayoutEffect(() => {
    if (!rows || !listRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      // pedestals grow out of the ground
      gsap.fromTo(
        ".lb-ped",
        { scaleY: 0 },
        { scaleY: 1, transformOrigin: "bottom", duration: 0.6, stagger: 0.12, ease: "power3.out" }
      );
      // people and rows pop in after
      gsap.fromTo(
        ".lb-item",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, delay: 0.15, ease: "power2.out" }
      );
      // streak numbers count up
      gsap.utils.toArray("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const n = { v: 0 };
        gsap.to(n, {
          v: target,
          duration: 1,
          delay: 0.2,
          ease: "power2.out",
          onUpdate: () => (el.textContent = Math.round(n.v)),
        });
      });
    }, listRef);
    return () => ctx.revert();
  }, [rows]);

  const activeRole = ROLES[role];
  const showBoard = !searching && rows && rows.length > 0;
  const podium = showBoard ? [rows[1], rows[0], rows[2]] : null; // 2-1-3
  const listRows = rows ? (showBoard ? rows.slice(3) : rows) : [];
  const maxDays = rows?.length ? Math.max(1, ...rows.map((r) => r.activeDays)) : 1;
  const myIdx = user ? (rows || []).findIndex((r) => r.username === user.username) : -1;

  // pedestal heights + true ranks in column order (2nd, 1st, 3rd)
  const PED = [
    { h: "h-16", rank: 2 },
    { h: "h-28", rank: 1 },
    { h: "h-10", rank: 3 },
  ];

  return (
    <div ref={rootRef} className="relative max-w-5xl mx-auto px-4 py-8">
      <div data-rise className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="w-fit mb-2">
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <SketchLine className="w-full h-3 mt-1.5" />
          </div>
          <p className="text-sm text-mute mb-6">
            Ranked by consistency. You can't fake showing up every day.
          </p>
        </div>
        {showBoard && (
          <p className="text-xs text-mute mb-6">
            <span className="text-ink font-semibold">{rows.length}</span> ranked ·
            top streak{" "}
            <span className="text-orange-400 font-semibold">
              {rows[0].currentStreak}
            </span>{" "}
            · best ever{" "}
            <span className="text-ink font-semibold">
              {Math.max(...rows.map((r) => r.longestStreak))}
            </span>{" "}
            days
          </p>
        )}
      </div>

      {/* role tabs */}
      <div data-rise className="flex flex-wrap gap-2 mb-4">
        {ROLE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setRole(k)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
              role === k ? "text-black font-semibold" : "border-line text-mute hover:text-ink"
            }`}
            style={role === k ? { background: ROLES[k].color, borderColor: ROLES[k].color } : {}}
          >
            <Icon name={ROLES[k].icon} size={12} /> {ROLES[k].label}
          </button>
        ))}
      </div>

      {/* search + streak filter — backend powered */}
      <div data-rise className="flex flex-wrap items-center gap-2 mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${activeRole.label.toLowerCase()}s by name…`}
          className="flex-1 min-w-[200px] bg-card border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        <div className="inline-flex border border-line rounded-lg overflow-hidden">
          {STREAK_CHIPS.map((c, idx) => (
            <button
              key={c.value}
              onClick={() => setMinStreak(c.value)}
              className={`text-[11px] px-3 py-2 transition inline-flex items-center gap-1 ${
                idx > 0 ? "border-l border-line" : ""
              } ${
                minStreak === c.value
                  ? "bg-brand/10 text-brand"
                  : "text-mute hover:text-ink"
              }`}
            >
              {c.value > 0 && <Icon name="flame" size={10} />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty
          icon="trophy"
          title={searching ? "No one matches" : "No one here yet"}
          hint={
            searching
              ? "Try a different name or a lower streak filter."
              : "Claim the #1 spot. Start logging your work."
          }
        />
      ) : (
        <div ref={listRef} className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-6 items-start">
        <div className="min-w-0">
          {/* the podium — steps, medals, gradient avatars */}
          {showBoard && (
            <div className="grid grid-cols-3 gap-3 items-end mb-6">
              {podium.map((r, col) => {
                const { h, rank } = PED[col];
                const medal = MEDALS[rank - 1];
                const first = rank === 1;
                return (
                  <div key={rank} className="flex flex-col items-center min-w-0">
                    {r ? (
                      <Link
                        to={`/u/${r.username}`}
                        className="lb-item flex flex-col items-center text-center mb-3 min-w-0 w-full group"
                      >
                        {first && (
                          <Icon
                            name="trophy"
                            size={20}
                            className="mb-2 flame-pulse"
                            style={{ color: medal }}
                          />
                        )}
                        <Avatar
                          name={r.name}
                          color={activeRole.color}
                          medal={medal}
                          className={
                            first ? "w-20 h-20 text-xl" : "w-14 h-14 text-sm"
                          }
                        />
                        <div
                          className={`font-semibold truncate w-full mt-2.5 group-hover:text-brand transition ${
                            first ? "text-base" : "text-sm"
                          }`}
                        >
                          {r.name}
                        </div>
                        <div className="text-[11px] text-mute truncate w-full">
                          @{r.username}
                        </div>
                        <div
                          className={`inline-flex items-center gap-1 font-bold text-orange-400 mt-1.5 ${
                            first ? "text-xl" : "text-sm"
                          }`}
                        >
                          <Icon name="flame" size={first ? 16 : 12} />
                          <span data-count={r.currentStreak}>{r.currentStreak}</span>
                        </div>
                        <div className="text-[10.5px] text-mute mt-0.5">
                          {r.activeDays} active days
                        </div>
                      </Link>
                    ) : (
                      // open spot — make sparse boards look like an invitation
                      <div className="lb-item flex flex-col items-center text-center mb-3">
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-line flex items-center justify-center text-mute text-lg">
                          ?
                        </div>
                        <div className="text-xs text-mute mt-2.5">Open spot</div>
                        <Link
                          to="/register"
                          className="text-[11px] text-brand hover:underline mt-1"
                        >
                          Claim it →
                        </Link>
                      </div>
                    )}
                    {/* pedestal step */}
                    <div
                      className={`lb-ped relative w-full ${h} bg-card border border-line rounded-t-xl overflow-hidden`}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-[3px]"
                        style={{ background: medal }}
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center text-4xl font-bold select-none"
                        style={{ color: medal, opacity: 0.18 }}
                      >
                        {rank}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* the chasing pack */}
          {listRows.length > 0 && (
            <Card className="p-0 overflow-hidden !rounded-xl">
              {listRows.map((r, i) => {
                const rank = (showBoard ? 3 : 0) + i + 1;
                const isYou = user?.username === r.username;
                return (
                  <Link
                    key={r.username}
                    to={`/u/${r.username}`}
                    className={`lb-item flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-card2 hover:pl-5 transition-all ${
                      isYou ? "bg-brand/5" : ""
                    }`}
                  >
                    <span className="w-6 text-xs text-mute text-center tabular-nums shrink-0">
                      {rank}
                    </span>
                    <Avatar
                      name={r.name}
                      color={activeRole.color}
                      className="w-9 h-9 text-[11px]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {r.name}
                        {isYou && (
                          <span className="ml-2 text-[10px] text-brand border border-brand/40 rounded-full px-1.5 py-0.5">
                            you
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 mt-1">
                        <span className="h-1 w-24 rounded-full bg-card2 overflow-hidden shrink-0">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.max(4, (r.activeDays / maxDays) * 100)}%`,
                              background: activeRole.color,
                            }}
                          />
                        </span>
                        <span className="text-[10.5px] text-mute truncate">
                          {r.activeDays} active days
                          {r.headline ? ` · ${r.headline}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                        <Icon name="flame" size={12} /> {r.currentStreak}
                      </span>
                      <span className="block text-[10.5px] text-mute">
                        best {r.longestStreak}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </Card>
          )}

          {/* where you stand */}
          {myIdx > -1 && (
            <div className="lb-item mt-4 flex items-center gap-3 border border-brand/40 bg-brand/5 rounded-xl px-4 py-3 text-sm">
              <Icon name="flame" size={15} className="text-brand" />
              <span>
                You're <span className="font-semibold">#{myIdx + 1}</span> of{" "}
                {rows.length}
                {myIdx > 0 && (
                  <span className="text-mute">
                    {" "}
                    · {rows[myIdx - 1].currentStreak - rows[myIdx].currentStreak || 1}{" "}
                    streak day
                    {(rows[myIdx - 1].currentStreak - rows[myIdx].currentStreak || 1) > 1 ? "s" : ""}{" "}
                    behind #{myIdx}
                  </span>
                )}
                {myIdx === 0 && <span className="text-mute"> · defend the crown 👑</span>}
              </span>
              <Link to="/log" className="ml-auto text-brand hover:underline text-xs shrink-0">
                Log today →
              </Link>
            </div>
          )}
        </div>

        {/* side rail — context that fills the board out */}
        <aside className="space-y-3">
          <Card className="lb-item !rounded-xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Icon name="flame" size={14} className="text-orange-400" /> Hall of flame
            </h3>
            <div className="space-y-2.5">
              {[...rows]
                .sort((a, b) => b.longestStreak - a.longestStreak)
                .slice(0, 3)
                .map((r, i) => (
                  <Link
                    key={r.username}
                    to={`/u/${r.username}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: MEDALS[i] }}
                    />
                    <span className="text-sm truncate flex-1 group-hover:text-brand transition">
                      {r.name}
                    </span>
                    <span className="text-xs text-mute shrink-0">
                      {r.longestStreak} days
                    </span>
                  </Link>
                ))}
            </div>
            <p className="text-[11px] text-mute mt-3 pt-3 border-t border-line">
              Longest streaks ever recorded in this profession.
            </p>
          </Card>

          <Card className="lb-item !rounded-xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Icon name="zap" size={14} style={{ color: activeRole.color }} /> Most active
            </h3>
            <div className="space-y-3">
              {[...rows]
                .sort((a, b) => b.activeDays - a.activeDays)
                .slice(0, 3)
                .map((r) => (
                  <Link key={r.username} to={`/u/${r.username}`} className="block group">
                    <span className="flex justify-between text-xs mb-1">
                      <span className="truncate group-hover:text-brand transition">
                        {r.name}
                      </span>
                      <span className="text-mute shrink-0 ml-2">{r.activeDays} days</span>
                    </span>
                    <span className="block h-1 rounded-full bg-card2 overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (r.activeDays / maxDays) * 100)}%`,
                          background: activeRole.color,
                        }}
                      />
                    </span>
                  </Link>
                ))}
            </div>
          </Card>

          <Card className="lb-item !rounded-xl">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Icon name="trophy" size={14} className="text-brand" /> How ranking works
            </h3>
            <ol className="space-y-2 text-xs text-mute">
              <li className="flex gap-2">
                <span className="text-brand font-semibold">1.</span>
                Current streak, the days you've shown up in a row
              </li>
              <li className="flex gap-2">
                <span className="text-brand font-semibold">2.</span>
                Active days, ties broken by total days logged
              </li>
              <li className="flex gap-2">
                <span className="text-brand font-semibold">3.</span>
                Weighted output, what you actually shipped
              </li>
            </ol>
            <p className="text-[11px] text-mute mt-3 pt-3 border-t border-line">
              One log a day is all it takes to climb. Miss a day and the streak resets.
            </p>
          </Card>

          <div className="lb-item bg-gradient-to-br from-brand/15 to-transparent border border-brand/30 rounded-xl p-4">
            <p className="text-sm font-semibold">
              {user ? "Climb the board" : "Get on the board"}
            </p>
            <p className="text-xs text-mute mt-1">
              {user
                ? "One entry today keeps the flame alive."
                : "Your first square takes 30 seconds."}
            </p>
            <Link
              to={user ? "/log" : "/register"}
              className="inline-flex items-center gap-1.5 mt-3 text-xs bg-brand text-ink font-medium rounded-lg px-3.5 py-2 hover:bg-[#d0764c] transition"
            >
              {user ? "Log today's work" : "Start your streak"} →
            </Link>
          </div>
        </aside>
        </div>
      )}
    </div>
  );
}
