import { useMemo, useState } from "react";
import { buildYearGrid, localToday, prettyDate } from "../utils/dates";

const DOW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// GitHub-style contribution heatmap. `days` = [{date, total, level}].
// `accent` tints levels via CSS var. `popDate` animates one cell (the
// applause moment when a new log lights up).
export default function Heatmap({ days = [], accent = "#c4633a", popDate = null }) {
  const today = localToday();
  const { weeks, monthLabels } = useMemo(() => buildYearGrid(today), [today]);
  const byDate = useMemo(() => {
    const m = new Map();
    for (const d of days) m.set(d.date, d);
    return m;
  }, [days]);

  // one shared fixed-position tooltip (edge case C5)
  const [tip, setTip] = useState(null);

  return (
    <div className="relative" style={{ "--accent": accent }}>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-max">
          {/* month labels */}
          <div className="ml-8 flex text-[10px] text-mute h-4 relative">
            {monthLabels.map((m) => (
              <span
                key={m.col + m.label}
                className="absolute"
                style={{ left: m.col * 13 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex">
            {/* day-of-week labels */}
            <div className="w-8 flex flex-col gap-[3px] text-[9px] text-mute pr-1">
              {DOW_LABELS.map((l, i) => (
                <span key={i} className="h-[10px] leading-[10px] text-right">
                  {l}
                </span>
              ))}
            </div>
            {/* the grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((cell) => {
                    if (!cell.inRange)
                      return <div key={cell.date} className="w-[10px] h-[10px]" />;
                    const d = byDate.get(cell.date);
                    const level = d?.level || 0;
                    return (
                      <div
                        key={cell.date}
                        className={`w-[10px] h-[10px] hm-cell hm-${level} ${
                          popDate === cell.date ? "hm-pop" : ""
                        }`}
                        onMouseEnter={(e) =>
                          setTip({
                            x: e.clientX,
                            y: e.clientY,
                            date: cell.date,
                            total: d?.total || 0,
                          })
                        }
                        onMouseMove={(e) =>
                          setTip((t) => t && { ...t, x: e.clientX, y: e.clientY })
                        }
                        onMouseLeave={() => setTip(null)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* legend */}
          <div className="flex items-center gap-1 justify-end mt-2 text-[10px] text-mute">
            <span className="mr-1">Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div key={l} className={`w-[10px] h-[10px] hm-cell hm-${l}`} />
            ))}
            <span className="ml-1">More</span>
          </div>
        </div>
      </div>

      {tip && (
        <div
          className="fixed z-50 pointer-events-none bg-card2 border border-line rounded-md px-2.5 py-1.5 text-xs shadow-xl"
          style={{
            left: Math.min(tip.x + 12, window.innerWidth - 180),
            top: tip.y - 40,
          }}
        >
          <span className="font-semibold">
            {tip.total > 0 ? `${tip.total} contribution pts` : "No contributions"}
          </span>{" "}
          <span className="text-mute">on {prettyDate(tip.date)}</span>
        </div>
      )}
    </div>
  );
}
