import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { ROLES, formatMetric } from "../config/roles";
import { Spinner, Empty, Button } from "../components/ui";
import { Icon } from "../components/icons";
import { prettyDate } from "../utils/dates";

const VERIFICATION_LABEL = {
  synced: "Meta API",
  imported: "Verified import",
  evidence: "Evidence",
  self_reported: "Self-reported",
};

// Print-ready résumé built from logged proof — recruiters get a PDF
// via the browser's print dialog, or just keep the live link.
export default function Resume() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/public/${username}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true));
  }, [username]);

  if (notFound)
    return <Empty icon="user" title={`@${username} doesn't exist`} />;
  if (!data) return <Spinner label="Building résumé…" />;

  const { profile, summary, recent, aiSummary } = data;
  const role = ROLES[profile.role];
  const profileUrl = `${window.location.origin}/u/${profile.username}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* actions — hidden when printing */}
      <div className="no-print flex items-center justify-between mb-6">
        <Link
          to={`/u/${profile.username}`}
          className="text-sm text-mute hover:text-ink transition"
        >
          ← Back to profile
        </Link>
        <Button onClick={() => window.print()}>
          <Icon name="download" size={14} /> Download PDF
        </Button>
      </div>

      {/* the sheet */}
      <div className="resume-sheet bg-[#faf7f2] text-[#1c1814] rounded-2xl shadow-2xl shadow-black/50 p-8 md:p-12">
        {/* header */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b-2 border-[#1c1814]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              {profile.name}
            </h1>
            <p className="mt-1 text-sm font-medium" style={{ color: role.color }}>
              {role.label}
            </p>
            {profile.headline && (
              <p className="mt-2 text-sm text-[#5f574d]">{profile.headline}</p>
            )}
          </div>
          <div className="text-right text-xs text-[#5f574d] shrink-0">
            <div className="font-medium text-[#1c1814]">@{profile.username}</div>
            <div className="mt-1">{profileUrl}</div>
            <div className="mt-1">
              Verified proof-of-work · Proofly
            </div>
          </div>
        </div>

        {/* AI summary */}
        {aiSummary?.text && (
          <section className="mt-6">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#8a7f72] mb-2">
              Summary
            </h2>
            <p className="text-sm leading-relaxed">{aiSummary.text}</p>
            {aiSummary.highlights?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {aiSummary.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="text-xs rounded-full px-3 py-1 border border-[#d8cfc2] bg-white"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* consistency — the numbers a resume can't fake */}
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#8a7f72] mb-3">
            Consistency
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              [summary.totalContributions, "contributions this year"],
              [`${summary.currentStreak} days`, "current daily streak"],
              [`${summary.longestStreak} days`, "longest streak"],
              [summary.activeDays, "active days"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="bg-white border border-[#e4dccf] rounded-xl px-3 py-3 text-center"
              >
                <div className="text-xl font-semibold">{v}</div>
                <div className="text-[10px] text-[#8a7f72] mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* lifetime metrics */}
        <section className="mt-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#8a7f72] mb-3">
            Lifetime output
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {role.metrics.map((m) => (
              <div
                key={m.key}
                className="border-l-2 pl-3"
                style={{ borderColor: role.color }}
              >
                <div className="text-lg font-semibold">
                  {formatMetric(summary.metricTotals[m.key], m.type)}
                </div>
                <div className="text-[10px] text-[#8a7f72]">{m.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* recent proof */}
        {recent.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#8a7f72] mb-3">
              Recent proof
            </h2>
            <ul className="space-y-2.5">
              {recent.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className="text-xs text-[#8a7f72] w-24 shrink-0">
                    {prettyDate(c.date)}
                  </span>
                  <span className="flex-1">
                    {Object.entries(c.metrics)
                      .map(([k, v]) => {
                        const m = role.metrics.find((x) => x.key === k);
                        return m ? `${formatMetric(v, m.type)} ${m.label}` : null;
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <span className="text-[10px] text-[#8a7f72] border border-[#d8cfc2] rounded-full px-2 py-0.5 shrink-0">
                    {VERIFICATION_LABEL[c.verification] || "Logged"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* footer */}
        <div className="mt-8 pt-4 border-t border-[#e4dccf] flex items-center justify-between text-[10px] text-[#8a7f72]">
          <span>
            Every number verified or logged daily on Proofly — not
            self-described.
          </span>
          <span className="font-medium">{profileUrl}</span>
        </div>
      </div>

      <p className="no-print text-center text-xs text-mute mt-4">
        Tip: in the print dialog choose "Save as PDF" — then send it, or just
        share your live link.
      </p>
    </div>
  );
}
