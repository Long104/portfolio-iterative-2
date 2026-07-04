// ── Armament / Spec Sheet ──
// Mobile Suit diagnostic readout.
// Not a glass panel — a bordered technical spec display with scanline effect.
// Each row is a label/value pair (POWER SOURCE → go · typescript · python).
// Scroll-triggered reveal: rows stagger in from left, status bar fills, text resolves.
// Continuous scanline animation gives cockpit CRT feel.
// Fixes SOTD audit C4: visually distinct from all other sections.

import { memo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { useScrollReveal } from "../hooks/useScrollReveal";

const TECH_SPECS = [
  { label: "POWER SOURCE", items: ["go", "typescript", "python"] },
  { label: "ARMAMENT", items: ["react", "three.js", "next.js", "tailwind"] },
  { label: "DEFENSE GRID", items: ["aws", "docker", "kubernetes", "terraform"] },
  { label: "SENSOR SUITE", items: ["postgres", "grpc", "fiber"] },
] as const;

export const ArmamentSection = memo(function ArmamentSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  // Section label: same split-chars scroll reveal as other sections
  const labelRef = useScrollReveal<HTMLDivElement>({
    split: "chars",
    stagger: 0.02,
    x: "-60%",
    y: "0%",
    start: "top 90%",
    end: "top 65%",
    duration: 0.4,
    ease: "power2.out",
  });

  useGSAP(() => {
    const rows = rowRefs.current.filter(Boolean) as HTMLDivElement[];
    const bar = barRef.current;
    const status = statusRef.current;
    if (!bar || !status) return;

    if (PREFERS_REDUCED_MOTION) {
      gsap.set(rows, { opacity: 1, x: 0 });
      gsap.set(bar, { width: "100%" });
      status.textContent = "ONLINE";
      return;
    }

    // Initial: hidden behind left offset
    gsap.set(rows, { opacity: 0, x: -24 });
    gsap.set(bar, { width: "0%" });
    status.textContent = "---";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 85%",
        end: "top 55%",
        toggleActions: "play none none none",
        once: true,
      },
      defaults: { ease: "power3.out" },
    });

    // 1. Rows stagger in from left
    tl.to(rows, {
      opacity: 1,
      x: 0,
      stagger: 0.18,
      duration: 0.6,
    });

    // 2. Status bar fills (slightly overlaps last row)
    tl.to(bar, {
      width: "100%",
      duration: 0.6,
      ease: "power2.inOut",
    }, "-=0.1");

    // 3. Resolve status text
    tl.call(() => {
      status.textContent = "ONLINE";
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="section armament" data-section-index={2}>
      <div ref={labelRef} className="section-label">armament</div>

      <div className="armament__frame">
        {/* Continuous CRT scanline */}
        <div className="armament__scanline" aria-hidden="true" />

        {/* Header */}
        <div className="armament__header">SYSTEM: KIRA-GEM — PILOT: PANTORN</div>

        {/* Spec rows */}
        <div className="armament__grid">
          {TECH_SPECS.map((spec, i) => (
            <div
              key={spec.label}
              ref={(el) => { rowRefs.current[i] = el; }}
              className="armament__row"
            >
              <span className="armament__label">{spec.label}</span>
              <span className="armament__value">{spec.items.join(" · ")}</span>
            </div>
          ))}
        </div>

        {/* Status line */}
        <div className="armament__status">
          <span className="armament__status-label">STATUS</span>
          <div className="armament__bar-track">
            <div ref={barRef} className="armament__bar-fill" />
          </div>
          <span ref={statusRef} className="armament__status-text">---</span>
        </div>
      </div>
    </section>
  );
});
