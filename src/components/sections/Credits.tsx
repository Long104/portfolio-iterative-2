// ── End Credits — movie-style scrolling credits ──
// The portfolio closes like a film.
// Auto-scrolls when section enters viewport (pinned).
// User scroll takes over; auto-scroll resumes after 1.5s of inactivity.
// Fade masks at top/bottom create the cinematic "stars in space" edge fade.

import { useRef, memo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, PREFERS_REDUCED_MOTION } from "../../lib/gsap";

interface CreditGroup {
  readonly title: string;
  readonly lines: readonly string[];
}

const CREDIT_GROUPS: readonly CreditGroup[] = [
  {
    title: "DIRECTED BY",
    lines: ["pantorn chuavallee"],
  },
  {
    title: "MUSIC",
    lines: [
      "\u201Cfar beyond the stars\u201D",
      "mobile suit gundam gquuuuuux ost",
      "all rights belong to bandai namco",
      "used for personal non-commercial use",
    ],
  },
  {
    title: "VISUAL EFFECTS",
    lines: [
      "three.js",
      "react-three-fiber",
      "custom glsl shaders",
      "gsap",
      "web audio api",
      "refractive glass system",
    ],
  },
  {
    title: "INSPIRED BY",
    lines: [
      "mobile suit gundam",
      "cockpit hud design",
      "psycommu systems",
      "\u2500\u2500\u2500",
      "a love letter to the newtype universe",
    ],
  },
  {
    title: "SOUND DESIGN",
    lines: [
      "all ui sound effects",
      "procedurally generated",
      "zero audio files",
      "pure web audio oscillators",
    ],
  },
  {
    title: "BUILT WITH",
    lines: ["react 19 \u00B7 typescript \u00B7 vite", "r3f \u00B7 gsap \u00B7 cloudflare pages"],
  },
  {
    title: "SPECIAL THANKS",
    lines: ["github.com/DolpratMIng"],
  },
  {
    title: "DISCLAIMER",
    lines: [
      "this is a fan-made portfolio.",
      "not affiliated with, endorsed by,",
      "or sponsored by bandai namco",
      "or sunrise.",
      "gundam and all related trademarks",
      "belong to their respective owners.",
    ],
  },
];

const AUTO_SCROLL_DELAY_MS = 1500;
const AUTO_SCROLL_SPEED = 0.8; // px per frame ~ 48px/s at 60fps

export const CreditsSection = memo(function CreditsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (PREFERS_REDUCED_MOTION) return;

      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      // ── Build the pin + scrub timeline ──
      const travel = track.offsetHeight + window.innerHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${travel}`,
          scrub: 1,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        track,
        { y: () => window.innerHeight },
        { y: () => -track.offsetHeight, ease: "none" },
      );

      // ── Auto-scroll: advance when user is idle and section is active ──
      let lastScrollTime = Date.now();
      let rafId = 0;

      function onScroll() {
        lastScrollTime = Date.now();
      }
      window.addEventListener("scroll", onScroll, { passive: true });

      function tick() {
        const trigger = tl.scrollTrigger;
        if (
          trigger &&
          trigger.isActive &&
          trigger.progress > 0.001 &&
          trigger.progress < 0.999 &&
          !document.documentElement.classList.contains("lenis-stopped")
        ) {
          const idle = Date.now() - lastScrollTime > AUTO_SCROLL_DELAY_MS;
          if (idle) {
            window.scrollBy(0, AUTO_SCROLL_SPEED);
          }
        }
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);

      return () => {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(rafId);
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="section section--centered credits"
      data-section-index={7}
    >
      <div className="credits__viewport">
        {/* Edge fade masks — cinematic star-field effect */}
        <div className="credits__fade credits__fade--top" />
        <div className="credits__fade credits__fade--bottom" />

        {/* Scrolling credits track — GSAP controls y */}
        <div ref={trackRef} className="credits__track">
          <div className="credits__title">
            {"\u2550\u2550 kira kira \u2550\u2550"}
          </div>

          {CREDIT_GROUPS.map((group, i) => (
            <div key={i} className="credits__group">
              <div className="credits__header">{group.title}</div>
              {group.lines.map((line, j) => (
                <div
                  key={j}
                  className={
                    "credits__line" +
                    (line === "\u2500\u2500\u2500" ? " credits__line--divider" : "")
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          ))}

          <div className="credits__fin">
            {"\u2550\u2550 fin \u2550\u2550"}
          </div>

          <div className="credits__joke">
            no mobile suits were harmed
            <br />
            in the making of this portfolio
          </div>

          <div className="credits__copyright">
            {"\u2500 \u00A9 2026 pantorn chuavallee \u2500"}
          </div>
        </div>
      </div>
    </section>
  );
});
