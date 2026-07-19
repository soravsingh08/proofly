import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Card, VerificationBadge } from "../components/ui";
import { Icon } from "../components/icons";

function Section({ icon, title, children }) {
  return (
    <Card data-rise>
      <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Icon name={icon} size={15} className="text-brand" /> {title}
      </h2>
      <div className="text-[13px] text-mute leading-relaxed space-y-2">{children}</div>
    </Card>
  );
}

function Point({ children }) {
  return (
    <p className="flex gap-2">
      <span className="text-brand shrink-0 mt-0.5">›</span>
      <span>{children}</span>
    </p>
  );
}

const Hl = ({ children }) => <span className="text-ink">{children}</span>;

// Role-aware user guide — every feature, explained for THEIR role.
export default function HowToUse() {
  const { user } = useAuth();
  const role = ROLES[user.role];
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative max-w-3xl mx-auto px-4 py-10">
      <div data-rise>
        <h1 className="text-2xl font-bold mb-1">How to use Proofly</h1>
        <p className="text-sm text-mute mb-6">
          Your guide as a <span style={{ color: role.color }}>{role.label}</span>, what everything
          does and how to build proof that recruiters actually trust.
        </p>
      </div>

      <div className="space-y-3">
        <Section icon="sparkles" title="The idea in 30 seconds">
          <Point>
            Proofly is a <Hl>public proof-of-work profile</Hl>, like GitHub's contribution graph,
            but for your profession. You log real work daily; it becomes a graph nobody can fake.
          </Point>
          <Point>
            The loop: <Hl>log today's work → a square lights up → your streak grows</Hl>. We rank
            consistency, not claims, showing up every day is the one thing that can't be faked.
          </Point>
          <Point>
            Your public page is <Hl>proofly.app/u/{user.username}</Hl>, share it anywhere, no login
            needed to view it.
          </Point>
        </Section>

        <Section icon="flame" title="Streak, freezes and score">
          <Point>
            <Hl>Streak</Hl> = consecutive days with at least one entry. Logging today or yesterday
            keeps it alive.
          </Point>
          <Point>
            Missed a day? You get <Hl>2 freezes per month</Hl>, click "<Hl>N freezes left</Hl>" on
            the dashboard, pick the missed day, and the streak survives. A freeze bridges the gap
            but adds no activity.
          </Point>
          <Point>
            <Hl>Score</Hl> rewards consistency first: active days and streak dominate, one-day
            volume spikes are damped. The leaderboard ranks by streak, game-resistant by design.
          </Point>
        </Section>

        <Section icon="check" title="The verification ladder">
          <p className="flex items-center gap-2 flex-wrap">
            <VerificationBadge level="self_reported" />
            <span>→</span>
            <VerificationBadge level="evidence" />
            <span>→</span>
            <VerificationBadge level="imported" />
          </p>
          <Point>
            <Hl>Self-reported</Hl>, you typed it. <Hl>Evidence</Hl>, you attached a proof link
            (PR, live campaign, design…). <Hl>Verified import</Hl>, it came straight from a
            connected source, untouched by hand.
          </Point>
          <Point>
            Your <Hl>verified %</Hl> on the dashboard is the number recruiters care about most, so
            push it up with proof links and connections.
          </Point>
        </Section>

        <Section icon="pencil" title="Logging your work">
          <Point>
            <Hl>Log Activity</Hl> tab → pick the date (Today/Yesterday chips, backfill up to 30
            days, no future dates) → set your numbers with the +/− steppers.
          </Point>
          <Point>
            Your metrics as a {role.label}:{" "}
            <Hl>{role.metrics.map((m) => m.label).join(" · ")}</Hl>. Zeros don't count, log at
            least one.
          </Point>
          <Point>
            Add a <Hl>proof link</Hl> (optional) and the entry upgrades to Evidence instantly. You
            can also attach proof later from any entry.
          </Point>
          <Point>
            The right rail shows your recent logs, <Hl>click any tile</Hl> for full detail: impact
            points, source, proof, and delete.
          </Point>
        </Section>

        <Section icon="trending-up" title="Reading your dashboard">
          <Point>
            Top row: <Hl>streak · score · active days · verified %</Hl>. The banner above nudges you
            with what matters right now ("log today to keep your streak").
          </Point>
          <Point>
            The <Hl>contribution graph</Hl> shows a rolling year, use the year chips (2026, 2025…)
            to view any calendar year. Hover a square for that day's total.
          </Point>
          <Point>
            <Hl>This week</Hl> compares you to last week and shows your best day ever.{" "}
            <Hl>Weekly goals</Hl>: set a target per metric ("+ add goal") and watch the bar fill.
            It resets every Monday.
          </Point>
          <Point>
            <Hl>Recent entries</Hl> has filters. All / Today / Yesterday / any date.{" "}
            <Hl>Achievements</Hl> unlock as you hit streaks, active days and verified milestones.
          </Point>
          <Point>
            <Hl>Account</Hl>: your public headline, streak reminder emails, password.{" "}
            <Hl>Download proof-of-work</Hl> gives the recruiter-ready report (print to PDF) and the
            CSV tracker template.
          </Point>
        </Section>

        <Section icon="zap" title="Auto-sync, connect once, we track daily">
          {user.role === "developer" && (
            <>
              <Point>
                <Hl>GitHub repos</Hl> (dashboard card or the Connect GitHub tab): paste any public
                repo link, your commits in it become Verified imports, re-synced every night and
                on demand with the 🔄 button.
              </Point>
              <Point>
                Set your <Hl>GitHub username</Hl> below the repo list, in shared repos only YOUR
                commits count. No password, ever: we read only what's already public.
              </Point>
              <Point>
                <Hl>LeetCode</Hl> (Connections tab): enter your LeetCode username — every day you
                solve becomes a Verified <Hl>LeetCode Solved</Hl> entry, synced nightly from your
                public profile.
              </Point>
            </>
          )}
          {role.metrics.some((m) => m.key === "video") && (
            <Point>
              <Hl>YouTube channel</Hl> (Connect tab): paste your channel link (with the UC… id) and
              new uploads count as videos automatically.
            </Point>
          )}
          <Point>
            <Hl>Google Sheet</Hl>, works for every role. Keep your work in a sheet (columns:{" "}
            <Hl>date + {role.metrics.map((m) => m.label).join(", ")}</Hl>), share it as "Anyone
            with the link", connect it, we fetch and log it daily. Grab the ready-made CSV
            template from the dashboard's download button.
          </Point>
          {role.importable && (
            <Point>
              <Hl>Import tab</Hl>, upload your Meta Ads Excel/CSV report: preview first, confirm,
              and the whole history lands as Verified imports.
            </Point>
          )}
          <Point>
            Everything synced is <Hl>idempotent</Hl>, re-syncing never duplicates, and
            disconnecting removes exactly what that source added.
          </Point>
        </Section>

        <Section icon="trophy" title="Leaderboard and sharing your proof">
          <Point>
            The <Hl>Leaderboard</Hl> ranks your profession by current streak, consistency beats
            claimed numbers.
          </Point>
          <Point>
            Share <Hl>proofly.app/u/{user.username}</Hl> with recruiters, your graph, badges,
            verified entries and proof links, all public.
          </Point>
          <Point>
            For applications: <Hl>Download proof-of-work → report</Hl>, a self-contained file with
            your stats, graph and work log. Every number in it can be verified live on your
            profile.
          </Point>
        </Section>
      </div>

      <p data-rise className="text-center text-sm text-mute mt-8">
        Best first step:{" "}
        <Link to="/log" className="text-brand hover:underline">
          log today's work
        </Link>{" "}
        and your graph starts with one square.
      </p>
    </div>
  );
}
