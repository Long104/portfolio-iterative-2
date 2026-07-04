import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

// ==========================================
// FRAME LIMITER — flat 30fps
// ==========================================
//
// Single tier: 30fps always.
// Pauses rendering when tab is hidden (visibilitychange).
// In frameloop="demand" mode, R3F only renders when invalidate() is called.

const FPS = 30;
const INTERVAL = 1000 / FPS;

export default function FrameLimiter() {
  const invalidate = useThree((state) => state.invalidate);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop);

      const elapsed = now - lastTimeRef.current;

      if (elapsed >= INTERVAL) {
        lastTimeRef.current = now - (elapsed % INTERVAL);
        invalidate();
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

    rafRef.current = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [invalidate]);

  return null;
}
