// ── useParallax ──
// Subtle parallax float for glass panels and HUD elements.
// As the element scrolls through the viewport, it shifts y from
// +range to -range, creating a "floating HUD glass" depth illusion.
//
// Targets: .glass-panel, .project-card, .nav-pill, .audio-bar
// Range: 20–30px is subtle but noticeable. Higher = more drama.
// Reduced-motion: silently no-ops.
//
// Pattern: gsap.fromTo + ScrollTrigger scrub. Each element gets
// its own trigger. No overlap with useScrollReveal's y tweens
// because this targets parent containers, not text children.

import { useEffect } from "react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";

/**
 * Applies subtle parallax float to selected elements.
 * @param selectors CSS selector string or array of selector strings
 * @param range Total y movement in px (default 20). Element shifts +range → -range.
 * @param scrubDuration Seconds of scrub smoothing (default 1.5)
 * @param enabled When false, skips setup (use with `started` state)
 */
export function useParallax(
  selectors: string | string[],
  range = 20,
  scrubDuration = 1.5,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || PREFERS_REDUCED_MOTION) return;

    const selector = Array.isArray(selectors) ? selectors.join(", ") : selectors;
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (els.length === 0) return;

    const tweens: gsap.core.Tween[] = [];

    els.forEach((el) => {
      // Skip elements that are hidden or have zero dimensions
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const tween = gsap.fromTo(
        el,
        { y: range },
        {
          y: -range,
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: scrubDuration,
          },
        },
      );
      tweens.push(tween);
    });

    return () => {
      tweens.forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  }, [selectors, range, scrubDuration, enabled]);
}
