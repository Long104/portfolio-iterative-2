import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { PERF_TIER } from "./perf";

// ==========================================
// FRAME LIMITER — adaptive fps with runtime fallback
// ==========================================
//
// High tier: starts at 60fps, measures actual frame times for ~2 seconds.
// If the GPU can't sustain 45fps avg → silently drops to 30fps permanently.
// Low/mobile: locked at 30fps from start — never tries 60.
//
// Idle detection: when the user hasn't scrolled for IDLE_SCROLL_MS,
// drops to IDLE_FPS to reduce GPU heat during static viewing.
// Resumes full speed on the next scroll event within 1 frame (~16ms).
//
// In frameloop="demand" mode, R3F only renders when invalidate() is called.
// rAF auto-pauses when the tab is hidden — no manual visibility handling needed.

const INITIAL_FPS =
  PERF_TIER === "high" || PERF_TIER === "tablet" ? 60 : 30;
const FALLBACK_FPS = 30;
const SAMPLE_FRAMES = 120;       // ~2 sec at 60fps, ~4 sec at 30fps
const MIN_ACCEPTABLE_FPS = 45;   // below this → drop to 30fps

const IDLE_SCROLL_MS = 2000;    // no scroll for 2s → enter idle
const IDLE_FPS = 15;             // render 15fps while idle (saves GPU heat)
const ACTIVE_FPS = 60;            // max fps during benchmark phase

export default function FrameLimiter() {
  const invalidate = useThree((state) => state.invalidate);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const fpsRef = useRef(INITIAL_FPS);
  const activeFpsRef = useRef(ACTIVE_FPS);

  // Runtime benchmark state
  const sampleCountRef = useRef(0);
  const totalDeltaRef = useRef(0);
  const downgradedRef = useRef(INITIAL_FPS === FALLBACK_FPS);

  // Idle detection state
  const lastScrollTimeRef = useRef(performance.now());

  useEffect(() => {
    function onScroll() {
      lastScrollTimeRef.current = performance.now();
      // If we're in idle mode, immediately resume full speed
      if (fpsRef.current < activeFpsRef.current) {
        fpsRef.current = activeFpsRef.current;
      }
    }

    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop);

      const elapsed = now - lastTimeRef.current;
      const interval = 1000 / fpsRef.current;

      if (elapsed >= interval) {
        lastTimeRef.current = now - (elapsed % interval);
        invalidate();

        // ── Benchmark: measure actual frame times on high tier ──
        if (!downgradedRef.current && sampleCountRef.current < SAMPLE_FRAMES) {
          if (sampleCountRef.current > 0) {
            totalDeltaRef.current += elapsed;
          }
          sampleCountRef.current++;

          if (sampleCountRef.current >= SAMPLE_FRAMES) {
            const avgDelta = totalDeltaRef.current / (SAMPLE_FRAMES - 1);
            const avgFps = 1000 / avgDelta;
            if (avgFps < MIN_ACCEPTABLE_FPS) {
              fpsRef.current = FALLBACK_FPS;
              downgradedRef.current = true;
              activeFpsRef.current = FALLBACK_FPS;
            } else {
              // Benchmark passed — this is the real fps we can sustain
              activeFpsRef.current = fpsRef.current;
            }
          }
        }

        // ── Idle detection: drop to 15fps when not scrolling ──
        if (now - lastScrollTimeRef.current > IDLE_SCROLL_MS) {
          if (fpsRef.current > IDLE_FPS) {
            fpsRef.current = IDLE_FPS;
          }
        }
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        if (rafRef.current === null) {
          lastTimeRef.current = 0;
          rafRef.current = requestAnimationFrame(loop);
        }
      }
    }

    // Listen for scroll events to track user activity
    window.addEventListener("scroll", onScroll, { passive: true });

    rafRef.current = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [invalidate]);

  return null;
}
