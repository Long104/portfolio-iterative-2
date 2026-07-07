// ── End Credits — movie-style auto-play with scroll-to-skip ──
// Credits auto-play from bottom to top like a movie.
// User can wheel/touch-scroll to fast-forward.
// After 400ms of no scroll input, normal speed resumes.

import { useRef, memo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, PREFERS_REDUCED_MOTION } from "../../lib/gsap";

// Mobile-safe viewport height.
// visualViewport.height excludes the address bar on iOS/Android.
// Falls back to innerHeight for older browsers.
function getViewportHeight(): number {
  if (window.visualViewport) {
    return window.visualViewport.height;
  }
  return window.innerHeight;
}

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

// Auto-play: ~15s bottom-to-top. Scroll input boosts speed proportionally.
const AUTO_PLAY_DURATION = 15;
const FF_MAX_BOOST = 3; // max additional timeScale from scroll (1x → 4x)
const FF_RESET_MS = 150; // return to normal after this long with no scroll

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
      // Track starts below viewport (y = viewportHeight) and scrolls up
      // until the last line rests near viewport bottom.
      // Uses getViewportHeight() to respect mobile address bar.
      const tl = gsap.timeline({ paused: true });

      function buildTimeline() {
        // Reset timeScale in case fast-forward (timeScale up to 4x) was active
        // when resize fired — tl.clear() preserves the boosted timeScale.
        tl.timeScale(1);
        tl.clear();
        const vh = getViewportHeight();
        tl.fromTo(
          track!,
          { y: vh },
          {
            y: -Math.max(0, track!.offsetHeight - vh),
            duration: AUTO_PLAY_DURATION,
            ease: "none",
          },
        );
      }

      buildTimeline();

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
      // Speed boost is proportional to scroll intensity, not a flat jump.
      // Gentle trackpad scroll ≈ 1.5x. Fast mouse wheel ≈ 3-4x. No scroll = 1x.
      let ffTimer: ReturnType<typeof setTimeout> | undefined;
      let touchStartY = 0;

      function setSpeed(boost: number) {
        if (!tl.isActive() || tl.progress() >= 0.99) return;
        tl.timeScale(1 + Math.min(boost, FF_MAX_BOOST));
        clearTimeout(ffTimer);
        ffTimer = setTimeout(() => {
          gsap.to(tl, { timeScale: 1, duration: 0.5, ease: "power2.out" });
        }, FF_RESET_MS);
      }

      function onWheel(e: WheelEvent) {
        if (e.deltaY <= 0) return;
        // Wheel delta: trackpad ~1-10, mouse wheel ~30-120
        setSpeed(e.deltaY / 50);
      }

      // ── Touch fast-forward (viewport-level, non-passive) ──
      // On mobile, passive touch events don't prevent iOS rubber-band overscroll
      // which consumes the gesture. Attaching non-passive to the credits viewport
      // lets us control the gesture without blocking page scroll elsewhere.
      function onTouchStart(e: TouchEvent) {
        touchStartY = e.touches[0]?.clientY ?? 0;
      }

      function onTouchMove(e: TouchEvent) {
        const currentY = e.touches[0]?.clientY ?? 0;
        const delta = touchStartY - currentY;
        if (delta > 5) {
          // Only prevent default when credits timeline is active
          // and user is at the bottom of the page (can't scroll further down)
          if (tl.isActive() && window.scrollY >= document.body.scrollHeight - getViewportHeight() - 10) {
            e.preventDefault(); // prevent iOS rubber band
          }
          setSpeed(delta / 40);
          touchStartY = currentY;
        }
      }

      // Wheel: passive on window (desktop)
      window.addEventListener("wheel", onWheel, { passive: true });
      // Touch: non-passive on credits viewport only (mobile)
      const viewport = section.querySelector(".credits__viewport");
      viewport?.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
      viewport?.addEventListener("touchmove", onTouchMove as EventListener, { passive: false });

      // ── Resize handler: recalc timeline on mobile address bar toggle ──
      // visualViewport resize fires when address bar shows/hides on iOS/Android.
      // Also handles orientation changes.
      let resizeTimer: ReturnType<typeof setTimeout> | undefined;

      function onViewportResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          // Refresh ScrollTrigger instance FIRST — recalculates trigger positions
          // after viewport height change. Using st.refresh() (instance-only)
          // instead of global ScrollTrigger.refresh() to avoid cascading refresh
          // of unrelated triggers. This may fire onLeaveBack/onEnter, but we
          // restore progress AFTER, so it takes precedence.
          st.refresh();
          // Now rebuild timeline with new viewport height and restore progress
          const wasPlaying = tl.isActive();
          const progress = tl.progress();
          buildTimeline();
          tl.progress(progress);
          if (wasPlaying) tl.play();
        }, 100);
      }

      const vv = window.visualViewport;
      if (vv) {
        vv.addEventListener("resize", onViewportResize);
      }
      window.addEventListener("orientationchange", onViewportResize);

      return () => {
        clearTimeout(ffTimer);
        clearTimeout(resizeTimer);
        window.removeEventListener("wheel", onWheel);
        viewport?.removeEventListener("touchstart", onTouchStart as EventListener);
        viewport?.removeEventListener("touchmove", onTouchMove as EventListener);
        if (vv) vv.removeEventListener("resize", onViewportResize);
        window.removeEventListener("orientationchange", onViewportResize);
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
