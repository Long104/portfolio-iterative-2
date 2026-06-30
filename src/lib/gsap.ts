// ── GSAP Foundation ──
// Central registration + reduced-motion detection.
// Import once in main.tsx to ensure plugins are available globally.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

// ── Reduced motion ──
// Checked by hooks — if true, all SplitText reverts immediately.
export const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, SplitText };
