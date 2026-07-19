import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { AmbientGlow, Card, Spinner, Empty } from "../components/ui";
import { Icon } from "../components/icons";

const MEDALS = ["#e8b923", "#b8bcc4", "#c98a56"];
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

  // rows slide in on every role/filter switch — the dynamic feel
  useLayoutEffect(() => {
    if (!rows || !listRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".lb-item",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: "power2.out" }
      );
    }, listRef);
    return () => ctx.revert();
  }, [rows]);

  const activeRole = ROLES[role];
  const podium = !searching && rows && rows.length >= 3 ? rows.slice(0, 3) : null;
  const listRows = podium ? rows.slice(3) : rows || [];

  return (
    <div ref={rootRef} className="relative max-w-3xl mx-auto px-4 py-8">
      <AmbientGlow />
      <div data-rise>
        <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
        <p className="text-sm text-mute mb-6">
          Ranked by consistency. You can't fake showing up every day.
        </p>
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
      <div data-rise className="flex flex-wrap items-center gap-2 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${activeRole.label.toLowerCase()}s by name…`}
          className="flex-1 min-w-[200px] bg-card border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        {STREAK_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => setMinStreak(c.value)}
            className={`text-[11px] rounded-full px-2.5 py-1.5 border transition inline-flex items-center gap-1 ${
              minStreak === c.value
                ? "border-brand text-brand bg-brand/10"
                : "border-line text-mute hover:text-ink"
            }`}
          >
            {c.value > 0 && <Icon name="flame" size={10} />}
            {c.label}
          </button>
        ))}
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
        <div ref={listRef}>
          {/* top-3 podium */}
          {podium && (
            <div className="grid grid-cols-3 gap-3 mb-4 items-end">
              {[podium[1], podium[0], podium[2]].map((r, gi) => {
                const rank = gi === 1 ? 0 : gi === 0 ? 1 : 2;
                const first = rank === 0;
                return (
                  <Link
                    key={r.username}
                    to={`/u/${r.username}`}
                    className={`lb-item block text-center bg-card border rounded-2xl px-3 hover:-translate-y-1 transition ${
                      first ? "py-6" : "py-4"
                    }`}
                    style={{ borderColor: `${MEDALS[rank]}45` }}
                  >
                    <Icon name="trophy" size={first ? 20 : 15} style={{ color: MEDALS[rank] }} />
                    <div
                      className={`mx-auto rounded-full flex items-center justify-center font-bold my-2 ${
                        first ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm"
                      }`}
                      style={{ background: `${activeRole.color}22`, color: activeRole.color }}
                    >
                      {initials(r.name)}
                    </div>
                    <div className={`font-semibold truncate ${first ? "text-base" : "text-sm"}`}>
                      {r.name}
                    </div>
                    <div className="text-[11px] text-mute truncate mb-2">@{r.username}</div>
                    <div
                      className={`inline-flex items-center gap-1 font-bold text-orange-400 ${
                        first ? "text-xl" : "text-base"
                      }`}
                    >
                      <Icon name="flame" size={first ? 16 : 13} /> {r.currentStreak}
                    </div>
                    <div className="text-[10.5px] text-mute mt-1">
                      {r.activeDays} active days
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* the rest */}
          {listRows.length > 0 && (
            <Card className="p-0 overflow-hidden">
              {listRows.map((r, i) => {
                const rank = (podium ? 3 : 0) + i + 1;
                const isYou = user?.username === r.username;
                return (
                  <Link
                    key={r.username}
                    to={`/u/${r.username}`}
                    className={`lb-item flex items-center gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-card2 transition ${
                      isYou ? "bg-brand/5" : ""
                    }`}
                  >
                    <span className="w-6 text-xs text-mute text-center shrink-0">{rank}</span>
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: `${activeRole.color}1c`, color: activeRole.color }}
                    >
                      {initials(r.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        {r.name}
                        {isYou && (
                          <span className="ml-2 text-[10px] text-brand border border-brand/40 rounded-full px-1.5 py-0.5">
                            you
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-mute truncate">
                        @{r.username}
                        {r.headline ? ` · ${r.headline}` : ""}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                        <Icon name="flame" size={12} /> {r.currentStreak}
                      </span>
                      <span className="block text-[10.5px] text-mute">
                        {r.activeDays} days · best {r.longestStreak}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
