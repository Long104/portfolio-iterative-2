// ── End Credits — movie-style auto-play with scroll-to-skip ──
// Credits auto-play from bottom to top like a movie.
// User can wheel/touch-scroll to fast-forward.
// After 400ms of no scroll input, normal speed resumes.

import { useRef, memo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, PREFERS_REDUCED_MOTION } from "../../lib/gsap";

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

// Auto-play: ~40s bottom-to-top. Scroll input boosts to 8x speed.
const AUTO_PLAY_DURATION = 40;
const FF_SCALE = 8;
const FF_RESET_MS = 400;

export const CreditsSection = memo(function CreditsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (PREFERS_REDUCED_MOTION) return;

      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      // ── Auto-play timeline (paused until section enters viewport) ──
      // Track starts below viewport (y = innerHeight) and scrolls up
      // until the last line rests near viewport bottom.
      const tl = gsap.timeline({ paused: true });

      tl.fromTo(
        track,
        { y: () => window.innerHeight },
        {
          y: () => -Math.max(0, track.offsetHeight - window.innerHeight),
          duration: AUTO_PLAY_DURATION,
          ease: "none",
        },
      );

      // ── Play when section enters, reset on scroll back ──
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 60%",
        onEnter: () => tl.play(),
        onLeaveBack: () => {
          tl.pause(0);
        },
      });

      // ── Scroll-to-skip: wheel / touch fast-forwards credits ──
      let ffTimer: ReturnType<typeof setTimeout> | undefined;
      let touchStartY = 0;

      function boostSpeed() {
        if (!tl.isActive() || tl.progress() >= 0.99) return;
        tl.timeScale(FF_SCALE);
        clearTimeout(ffTimer);
        ffTimer = setTimeout(() => {
          tl.timeScale(1);
        }, FF_RESET_MS);
      }

      function onWheel(e: WheelEvent) {
        if (e.deltaY > 0) boostSpeed();
      }

      function onTouchStart(e: TouchEvent) {
        touchStartY = e.touches[0]?.clientY ?? 0;
      }

      function onTouchMove(e: TouchEvent) {
        const currentY = e.touches[0]?.clientY ?? 0;
        if (touchStartY - currentY > 10) boostSpeed();
      }

      window.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });

      return () => {
        clearTimeout(ffTimer);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        st.kill();
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
