// ── HUD — Corner status readout ──
// Corner labels with GSAP-driven micro-interactions:
// - Entrance stagger (per-corner slide-in on boot)
// - Audio status pulse (gently pulses when playing)
// - Section counter flip (opacity crossfade on change)

import { useRef, useEffect } from "react";
import { gsap } from "../lib/gsap";

interface HUDProps {
  sectionIndex: number;
  totalSections: number;
  audioStatus: string;
  trackName: string;
  isPlaying: boolean;
}

export function HUD({
  sectionIndex,
  totalSections,
  audioStatus,
  trackName,
  isPlaying,
}: HUDProps) {
  const counter = `sector ${String(sectionIndex + 1).padStart(2, "0")}/${String(totalSections).padStart(2, "0")}`;

  const counterRef = useRef<HTMLDivElement>(null);

  // ── Counter crossfade ──
  useEffect(() => {
    const el = counterRef.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: -4 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
      },
    );
  }, [counter]);

  return (
    <>
      {/* Top-left: identity — drops down */}
      <div className="hud hud--tl">
        <div className="hud__name">Pantorn Chuavallee</div>
        <div className="hud__role">pilot</div>
      </div>

      {/* Top-right: audio status — slides in from right */}
      <div className="hud hud--tr">
        <div className="hud__status">
          <span className={"hud__dot" + (isPlaying ? " hud__dot--live" : "")} />
          <span>{audioStatus}</span>
        </div>
        <div className="hud__hint">{trackName}</div>
      </div>

      {/* Bottom-right: section counter — slides in from right */}
      {sectionIndex > 0 && (
        <div className="hud hud--br">
          <div ref={counterRef} className="hud__counter">
            {counter}
          </div>
        </div>
      )}
    </>
  );
}
