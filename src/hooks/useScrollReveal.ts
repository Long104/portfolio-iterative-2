// ── useScrollReveal ──
// Scroll-triggered SplitText reveal hook.
// Wraps text into words/lines/chars, then animates in with:
//   • overflow:hidden mask (text rises into a window)
//   • clip-path wipe (left→right)
//   • optional blur→clear
//   • stagger between units
//
// Compiler-safe: uses useGSAP with scope + revertOnUpdate.
// Same imperative-escape pattern as KiraKiraVortex.tsx.

import { useRef, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { PERF_TIER } from "../perf";

// ── Options ──
export interface ScrollRevealOptions {
  /** Split type — default 'words' */
  split?: "words" | "lines" | "chars";
  /** Stagger delay between units (seconds) — auto-tuned for mobile */
  stagger?: number;
  /** translateY start value — auto-tuned for mobile */
  y?: string;
  /** Enable clip-path wipe (inset left→right) */
  clipWipe?: boolean;
  /** Enable blur→clear */
  blur?: boolean;
  /** ScrollTrigger scrub: true|number = scroll-linked, false = play once */
  scrub?: boolean | number;
  /** ScrollTrigger start position — default 'top 80%' */
  start?: string;
  /** Play only once (ignore scrub) — default true */
  once?: boolean;
  /** Ease for individual unit animations */
  ease?: string;
  /** Base opacity of units before reveal — default 1 */
  fromOpacity?: number;
}

const DEFAULTS: Required<Pick<
  ScrollRevealOptions,
  "split" | "stagger" | "y" | "clipWipe" | "blur" | "scrub" | "start" | "once" | "ease" | "fromOpacity"
>> = {
  split: "words",
  stagger: 0.08,
  y: "120%",
  clipWipe: true,
  blur: false,
  scrub: 1,
  start: "top 80%",
  once: true,
  ease: "power4.out",
  fromOpacity: 1,
} as const;

// ── Hook ──
export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {}
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      // ── Reduced motion: show text static, no animation ──
      if (PREFERS_REDUCED_MOTION) {
        el.style.visibility = "visible";
        return;
      }

      // ── Mobile tuning: halve stagger and y offset ──
      const isMobile = PERF_TIER === "mobile";
      const opts = { ...DEFAULTS, ...options };
      const stagger = isMobile ? (opts.stagger as number) * 0.5 : (opts.stagger as number);
      const yVal = opts.y; // guaranteed string from DEFAULTS
      const blur = isMobile ? false : opts.blur;

      // ── SplitText: mask wraps lines in overflow:hidden ──
      const split = new SplitText(el, {
        type: opts.split,
        mask: "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
      });

      const targets =
        opts.split === "lines"
          ? split.lines
          : opts.split === "chars"
            ? split.chars
            : split.words;

      if (targets.length === 0) return;

      // ── Animation config per unit ──
      const fromVars: gsap.TweenVars = {
        y: yVal,
        opacity: opts.fromOpacity,
        ...(blur ? { filter: "blur(6px)" } : {}),
      };

      const toVars: gsap.TweenVars = {
        y: "0%",
        opacity: 1,
        filter: "blur(0px)",
        stagger,
        ease: opts.ease,
        scrollTrigger: {
          trigger: el,
          start: opts.start,
          toggleActions: opts.scrub ? undefined : "play none none none",
          scrub: opts.scrub === false ? undefined : opts.scrub === true ? 1 : opts.scrub,
          once: opts.once,
        },
      };

      // Build timeline: from state → to state
      const tl = gsap.timeline();
      tl.fromTo(targets, fromVars, toVars);

      // ── Clip-path wipe on the element itself (parallel) ──
      if (opts.clipWipe) {
        tl.fromTo(
          el,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.6,
            ease: "power2.out",
          },
          "<"
        );
      }

      // ── Cleanup: revert split on unmount / re-render ──
      return () => {
        split.revert();
      };
    },
    { scope: ref, revertOnUpdate: true }
  );

  return ref;
}
