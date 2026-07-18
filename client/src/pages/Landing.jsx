import { Link } from "react-router-dom";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Button } from "../components/ui";

// Fake mini-heatmap for the hero — pure visual, no data needed
function HeroGraph({ color }) {
  const cells = Array.from({ length: 91 }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const v = r - Math.floor(r);
    const weekday = i % 7 !== 0 && i % 7 !== 6;
    return v < (weekday ? 0.75 : 0.25) ? Math.ceil(v * 4) : 0;
  });
  return (
    <div className="grid grid-rows-7 grid-flow-col gap-[3px]" style={{ "--accent": color }}>
      {cells.map((l, i) => (
        <div key={i} className={`w-[9px] h-[9px] hm-cell hm-${l}`} />
      ))}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* hero */}
      <section className="text-center pt-20 pb-14">
        <div className="inline-block text-xs text-mute border border-line rounded-full px-3 py-1 mb-6">
          GitHub for Every Profession
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
          Don't tell recruiters what you did.
          <br />
          <span className="text-brand">Prove it — every day.</span>
        </h1>
        <p className="text-mute mt-5 max-w-xl mx-auto">
          Developers have GitHub. Now sales, marketing, HR, ads and design
          professionals get a public proof-of-work profile too — built one
          contribution at a time.
        </p>
        <div className="flex justify-center gap-3 mt-8">
          <Link to="/register">
            <Button className="px-6 py-2.5">Start your streak →</Button>
          </Link>
          <Link to="/u/arjun">
            <button className="border border-line rounded-lg px-6 py-2.5 text-sm text-mute hover:text-ink hover:border-mute transition">
              See a live profile
            </button>
          </Link>
        </div>
      </section>

      {/* role cards with mini graphs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {ROLE_KEYS.map((k) => {
          const role = ROLES[k];
          return (
            <div key={k} className="bg-card border border-line rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{role.icon}</span>
                <span className="font-semibold text-sm">{role.label}</span>
              </div>
              <HeroGraph color={role.color} />
              <p className="text-[11px] text-mute mt-3">
                {role.metrics.map((m) => m.label).join(" · ")}
              </p>
            </div>
          );
        })}
      </section>

      <footer className="text-center text-xs text-mute pb-10">
        Proofly — consistency you can't fake. Built in 24 hours.
      </footer>
    </div>
  );
}
