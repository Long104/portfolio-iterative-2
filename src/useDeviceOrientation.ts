// ── useDeviceOrientation ──
// Apple Liquid Glass-style specular tilt.
// Light is world-fixed at 115° (upper-left). Device tilt shifts the
// highlight ±20° with lerp smoothing — like tilting a real glass pane
// under a desk lamp. Highlight glides, never orbits.

import { useState, useEffect, useRef } from "react";

const BASE_ANGLE = 2.007;   // 115° in radians — Apple's system-wide upper-left light
const TILT_RANGE = 0.349;   // ±20° in radians — subtle parallax shift
const SMOOTHING = 0.1;      // lerp factor — glide, don't snap

export function useDeviceOrientation(): number {
  const [specularAngle, setSpecularAngle] = useState(BASE_ANGLE);
  const currentRef = useRef(BASE_ANGLE);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!mounted) return;
      const gamma = e.gamma ?? 0; // -90 (right) to +90 (left)

      // Clamp to ±45° comfortable handheld range, normalize to [-1, 1]
      const normalized = Math.max(-1, Math.min(1, gamma / 45));

      // Target: base shifted by tilt (inverted — parallax)
      // Tilt right → glass rotates clockwise → highlight shifts left (lower angle)
      const target = BASE_ANGLE - (normalized * TILT_RANGE);

      // Smooth lerp toward target
      currentRef.current += (target - currentRef.current) * SMOOTHING;

      // rAF throttle — skip if a frame is already pending
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setSpecularAngle(currentRef.current);
        });
      }
    }

    // iOS 13+ requires explicit permission
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      "requestPermission" in DeviceOrientationEvent
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((state: string) => {
          if (state === "granted" && mounted) {
            window.addEventListener("deviceorientation", handleOrientation);
          }
        })
        .catch(() => { /* permission denied — stay at base angle */ });
    } else if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  return specularAngle;
}
