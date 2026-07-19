// About us — the origin story as a GSAP showcase: char-split hero,
// scroll-scrubbed quote, progress-line timeline, parallax cells,
// 3D-tilt team cards and a magnetic CTA.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import api from "../api/client";
import { Button } from "../components/ui";

gsap.registerPlugin(ScrollTrigger);

const TITLE_LINES = ["It started with", "one question."];
const QUOTE_WORDS = "So where is this for the rest of us?".split(" ");

const BEATS = [
  {
    n: "01",
    title: "The conversation",
    text:
      "One afternoon in the office, one of us was explaining GitHub to a colleague on the marketing team. The green squares, the streaks, the profile that quietly proves a developer shows up every single day.",
  },
  {
    n: "02",
    title: "The question",
    text:
      "Halfway through, she stopped us: \"so where is this for the rest of us?\" There wasn't one. No graph for campaigns shipped, deals closed, hires made or designs delivered. A whole world of daily work, leaving no trace anyone can trust.",
  },
  {
    n: "03",
    title: "The build",
    text:
      "So we built it. Proofly gives every profession a public proof-of-work profile: log the day's work, back it with evidence, and let consistency do the talking. Built in 24 hours, running on the same idea that made GitHub's graph famous.",
  },
];

// scattered contribution cells that drift at different speeds on scroll
const FLOATERS = [
  { color: "#22c55e", left: "6%", top: 90, size: 14, speed: -90 },
  { color: "#f59e0b", left: "13%", top: 250, size: 9, speed: -150 },
  { color: "#3b82f6", left: "88%", top: 120, size: 12, speed: -70 },
  { color: "#a855f7", left: "93%", top: 300, size: 8, speed: -180 },
  { color: "#ef4444", left: "80%", top: 380, size: 10, speed: -120 },
  { color: "#c4633a", left: "18%", top: 400, size: 12, speed: -60 },
];

export default function About() {
  const root = useRef(null);
  const [team, setTeam] = useState([
    { name: "Sorav Singh", title: "Co-founder" },
    { name: "Vipul Kataria", title: "Co-founder" },
  ]);

  useEffect(() => {
    api
      .get("/site")
      .then((r) => r.data.team?.length && setTeam(r.data.team))
      .catch(() => {});
  }, []);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cleanups = [];

    const ctx = gsap.context(() => {
      // hero: characters flip up out of the baseline, back-eased
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".about-eyebrow", { y: 20, opacity: 0, duration: 0.6 }, 0.1)
        .from(
          ".about-char",
          {
            yPercent: 115,
            duration: 0.8,
            stagger: 0.018,
            ease: "power4.out",
          },
          0.2
        )
        .from(".about-sub", { y: 20, opacity: 0, duration: 0.6 }, "-=0.35")
        .from(".about-float", { opacity: 0, scale: 0, duration: 0.5, stagger: 0.06, ease: "back.out(2)" }, "-=0.4");

      // floating cells parallax away at their own speeds
      gsap.utils.toArray(".about-float").forEach((el) => {
        gsap.to(el, {
          y: Number(el.dataset.speed),
          ease: "none",
          scrollTrigger: {
            trigger: ".about-hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      // the quote lights up word by word as you scroll through it
      gsap.fromTo(
        ".about-word",
        { opacity: 0.12 },
        {
          opacity: 1,
          stagger: 0.06,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-quote",
            start: "top 80%",
            end: "center 45%",
            scrub: true,
          },
        }
      );

      // story beats slide in from alternating sides
      gsap.utils.toArray(".about-beat").forEach((el, i) => {
        gsap.from(el, {
          x: i % 2 ? 70 : -70,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      // terracotta progress line draws down the timeline as you read
      gsap.fromTo(
        ".about-progress",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".about-beats",
            start: "top 70%",
            end: "bottom 55%",
            scrub: true,
          },
        }
      );

      // generic reveals
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      // team cards tilt in 3D toward the cursor
      gsap.utils.toArray(".team-card").forEach((card) => {
        gsap.set(card, { transformPerspective: 600 });
        const rx = gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power2.out" });
        const ry = gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power2.out" });
        const move = (e) => {
          const r = card.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 14);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          card.removeEventListener("mousemove", move);
          card.removeEventListener("mouseleave", leave);
        });
      });

      // magnetic CTA: the button leans toward the cursor, snaps back
      const area = root.current.querySelector(".magnet-area");
      const btn = root.current.querySelector(".magnet-btn");
      if (area && btn) {
        const bx = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
        const by = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });
        const move = (e) => {
          const r = area.getBoundingClientRect();
          bx((e.clientX - r.left - r.width / 2) * 0.35);
          by((e.clientY - r.top - r.height / 2) * 0.35);
        };
        const leave = () =>
          gsap.to(btn, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
        area.addEventListener("mousemove", move);
        area.addEventListener("mouseleave", leave);
        cleanups.push(() => {
          area.removeEventListener("mousemove", move);
          area.removeEventListener("mouseleave", leave);
        });
      }
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root} className="relative overflow-x-clip">
      <div className="hero-glow absolute inset-x-0 top-0 h-[480px] pointer-events-none" />

      {/* drifting contribution cells */}
      <div className="hidden md:block absolute inset-x-0 top-0 h-[520px] pointer-events-none" aria-hidden="true">
        {FLOATERS.map((c, i) => (
          <div
            key={i}
            className="about-float absolute rounded-[3px]"
            data-speed={c.speed}
            style={{
              left: c.left,
              top: c.top,
              width: c.size,
              height: c.size,
              background: c.color,
              opacity: 0.55,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-4xl mx-auto px-4">
        {/* hero */}
        <section className="about-hero text-center pt-20 pb-8">
          <div className="about-eyebrow text-[11px] uppercase tracking-[0.3em] text-brand mb-6">
            About us
          </div>
          <h1
            className="text-5xl md:text-7xl font-medium tracking-[-0.03em] leading-[1.02]"
            style={{ perspective: 600 }}
          >
            {TITLE_LINES.map((line) => (
              <span
                key={line}
                className="block overflow-hidden pb-[0.1em] -mb-[0.1em]"
              >
                {line.split("").map((ch, i) => (
                  <span key={i} className="about-char inline-block">
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="about-sub text-mute mt-6 max-w-xl mx-auto leading-relaxed">
            Proofly wasn't planned in a boardroom. It fell out of an ordinary
            office conversation between a developer and a marketer.
          </p>
        </section>

        {/* the pivotal quote — scrubbed in word by word */}
        <section className="about-quote text-center py-16">
          <div className="text-6xl text-brand leading-none">"</div>
          <blockquote className="text-3xl md:text-5xl font-medium tracking-tight leading-snug max-w-2xl mx-auto">
            {QUOTE_WORDS.map((w, i) => (
              <span key={i} className="about-word inline-block mr-[0.26em]">
                {w}
              </span>
            ))}
          </blockquote>
          <p className="text-sm text-mute mt-5">
            a marketing colleague, mid-GitHub-demo
          </p>
        </section>

        {/* the three beats along a drawing timeline */}
        <section className="about-beats relative py-10 pl-8 md:pl-12 space-y-5">
          <div className="absolute left-2 md:left-4 top-10 bottom-10 w-px bg-line" aria-hidden="true" />
          <div
            className="about-progress absolute left-2 md:left-4 top-10 bottom-10 w-px bg-brand origin-top"
            aria-hidden="true"
          />
          {BEATS.map((b) => (
            <div
              key={b.n}
              className="about-beat flex gap-6 bg-card border border-line rounded-2xl p-6 md:p-8"
            >
              <span className="text-3xl font-semibold tabular-nums text-brand shrink-0 leading-none">
                {b.n}
              </span>
              <div>
                <h2 className="font-semibold text-lg mb-2">{b.title}</h2>
                <p className="text-mute leading-relaxed">{b.text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* team */}
        <section className="py-12">
          <div data-reveal className="text-center mb-10">
            <div className="text-[11px] uppercase tracking-[0.3em] text-brand mb-4">
              The team
            </div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
              Two people, 24 hours
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
            {team.map((t) => (
              <div
                key={t.name}
                data-reveal
                className="team-card bg-card border border-line rounded-2xl p-6 text-center will-change-transform"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-brand/15 border border-brand/40 text-brand flex items-center justify-center font-semibold text-lg">
                  {t.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="font-semibold mt-3">{t.name}</div>
                <div className="text-xs text-mute mt-0.5">{t.title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* magnetic CTA */}
        <section data-reveal className="text-center pt-8 pb-20">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight">
            We rank consistency, not claims.
          </h2>
          <p className="text-mute mt-3">
            Your first green square is 30 seconds away.
          </p>
          <div className="magnet-area inline-block p-8 -m-4">
            <Link to="/register" className="magnet-btn inline-block will-change-transform">
              <Button className="px-8 py-3">Start your streak</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
