// ── Section Transition — Gundam Targeting Scan ──
// When the active section changes, a thin scan line sweeps top→bottom
// across the viewport. Gives each section change a "lock-on" ritual.
//
// Layer: fixed, above content (z-index 45), below HUD (z-index 50).
// Pointer-events: none — never blocks interaction.

import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";

interface Props {
  activeSection: number;
}

export function SectionTransition({ activeSection }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const lastSection = useRef(activeSection);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    // Skip first mount — no transition on initial load
    if (lastSection.current === activeSection) return;

    // ── Throttle: if a transition is already playing, skip this one ──
    // Prevents overlapping scan lines from rapid nav clicks.
    if (timelineRef.current && timelineRef.current.isActive()) return;

    // Capture direction BEFORE overwriting lastSection.current
    const direction = activeSection > lastSection.current ? 1 : -1;
    lastSection.current = activeSection;

    const scan = scanRef.current;
    if (!scan) return;

    // Kill any previous timeline before creating a new one
    timelineRef.current?.kill();

    // ── Scan line sweep ──
    const tl = gsap.timeline();
    timelineRef.current = tl;

    // Start scan line from top (or bottom if scrolling up)
    gsap.set(scan, {
      y: direction > 0 ? "0vh" : "100vh",
      opacity: 1,
    });

    tl.to(scan, {
      y: direction > 0 ? "100vh" : "0vh",
      duration: 0.5,
      ease: "power2.inOut",
    }).to(scan, {
      opacity: 0,
      duration: 0.2,
    }, "-=0.2");

    // Clean up the ref when done
    tl.call(() => {
      if (timelineRef.current === tl) timelineRef.current = null;
    });

    return () => {
      tl.kill();
      if (timelineRef.current === tl) timelineRef.current = null;
    };
  }, [activeSection]);

  return (
    <div ref={containerRef} className="section-transition" aria-hidden="true">
      <div ref={scanRef} className="section-transition__scan" />
    </div>
  );
}
