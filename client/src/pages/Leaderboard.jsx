import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Card, Spinner, Empty } from "../components/ui";
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
        {/* segmented streak filter — one solid control, not floating pills */}
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
        <div ref={listRef}>
          {/* top-3 — one solid banded strip, ranks read left to right */}
          {podium && (
            <div className="mb-4 grid sm:grid-cols-3 bg-card border border-line rounded-xl overflow-hidden">
              {podium.map((r, i) => (
                <Link
                  key={r.username}
                  to={`/u/${r.username}`}
                  className={`lb-item relative block p-5 hover:bg-card2 transition ${
                    i > 0 ? "border-t sm:border-t-0 sm:border-l border-line" : ""
                  }`}
                >
                  {/* thin medal band instead of a glowing border */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ background: MEDALS[i] }}
                  />
                  <div className="flex items-baseline justify-between">
                    <span
                      className={`font-semibold tabular-nums leading-none ${
                        i === 0 ? "text-4xl" : "text-2xl"
                      }`}
                      style={{ color: MEDALS[i] }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                      <Icon name="flame" size={13} /> {r.currentStreak}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <span
                      className="w-10 h-10 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        color: activeRole.color,
                        borderColor: `${activeRole.color}55`,
                      }}
                    >
                      {initials(r.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{r.name}</span>
                      <span className="block text-[11px] text-mute truncate">@{r.username}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-mute mt-3">
                    {r.activeDays} active days · best {r.longestStreak}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* the rest */}
          {listRows.length > 0 && (
            <Card className="p-0 overflow-hidden !rounded-xl">
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
                    <span className="w-6 text-xs text-mute text-center tabular-nums shrink-0">{rank}</span>
                    <span
                      className="w-8 h-8 rounded-md border flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ color: activeRole.color, borderColor: `${activeRole.color}45` }}
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
