// ── Haro Companion ──
// Small SVG robot inspired by Gundam GQuuuuuuX.
// Floats in bottom-left corner, blinks randomly, narrates section changes.
// Eyes flash + speech types out on section transition.
// Pure SVG + GSAP — zero canvas, zero rAF loops for idle.

import { useEffect, useRef } from "react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { getMouseState } from "../mouseStore";

const HARO_LINES = [
  "// pilot profile loaded",
  "// engineering × visual art",
  "// combat record accessed",
  "// mission archive — targets detected",
  "// system status readout",
  "// communication channel open",
] as const;

interface HaroProps {
  sectionIndex: number;
}

export function Haro({ sectionIndex }: HaroProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const eyeLeftRef = useRef<SVGEllipseElement>(null);
  const eyeRightRef = useRef<SVGEllipseElement>(null);
  const speechRef = useRef<HTMLSpanElement>(null);
  const prevSection = useRef(-1);

  // ── Gentle float ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const body = bodyRef.current;
    if (!body) return;

    gsap.to(body, {
      y: -5,
      duration: 2.5,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }, []);

  // ── Random blink ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;

    let timer: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = 2000 + Math.random() * 4000;
      timer = setTimeout(() => {
        blink();
        scheduleBlink();
      }, delay);
    }

    function blink() {
      const left = eyeLeftRef.current;
      const right = eyeRightRef.current;
      if (!left || !right) return;

      gsap.timeline()
        .to([left, right], { attr: { ry: 0.4 }, duration: 0.06, ease: "power2.in" })
        .to([left, right], { attr: { ry: 3.5 }, duration: 0.08, ease: "power2.out" });
    }

    scheduleBlink();
    return () => clearTimeout(timer);
  }, []);

  // ── Eye tracking: eyes follow cursor subtly ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const eyes = eyesRef.current;
    if (!eyes) return;
    const eyesEl: SVGGElement = eyes;

    let lastUpdate = 0;
    function onTick(t: number) {
      if (t - lastUpdate < 80) return; // ~12fps
      lastUpdate = t;
      const { x, y } = getMouseState();
      eyesEl.style.transform = `translate(${(x * 1.5).toFixed(1)}px, ${(-y * 1).toFixed(1)}px)`;
    }

    gsap.ticker.add(onTick);
    return () => gsap.ticker.remove(onTick);
  }, []);

  // ── Section change: flash eyes + type speech ──
  useEffect(() => {
    if (prevSection.current === sectionIndex) return;
    prevSection.current = sectionIndex;

    const left = eyeLeftRef.current;
    const right = eyeRightRef.current;
    const speech = speechRef.current;
    if (!left || !right || !speech) return;

    const text = HARO_LINES[sectionIndex] ?? "";

    if (PREFERS_REDUCED_MOTION) {
      speech.textContent = text;
      return;
    }

    // Flash eyes magenta
    gsap.timeline()
      .to([left, right], { attr: { fill: "#FF4FD8" }, duration: 0.1 })
      .to([left, right], { attr: { fill: "#01314a" }, duration: 0.3, delay: 0.15 });

    // Type speech
    speech.textContent = "";
    const proxy = { n: 0 };
    gsap.to(proxy, {
      n: text.length,
      duration: text.length * 0.022,
      ease: "none",
      onUpdate: () => {
        speech.textContent = text.slice(0, Math.round(proxy.n));
      },
    });
  }, [sectionIndex]);

  return (
    <div className="haro" aria-hidden="true">
      <div ref={bodyRef} className="haro__body">
        <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
          <defs>
            <radialGradient id="haro-grad" cx="38%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>
          </defs>

          {/* Body */}
          <ellipse cx="22" cy="22" rx="20" ry="18" fill="url(#haro-grad)"
            style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.25))" }} />

          {/* Hemisphere cap line */}
          <path d="M 3 20 Q 22 13 41 20" fill="none"
            stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />

          {/* Side panel lines */}
          <line x1="2" y1="22" x2="5" y2="22" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="39" y1="22" x2="42" y2="22" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />

          {/* Eyes group (tracks cursor) */}
          <g ref={eyesRef} style={{ transition: "transform 0.15s ease-out" }}>
            <ellipse ref={eyeLeftRef} cx="16" cy="18" rx="2.5" ry="3.5" fill="#01314a" />
            <ellipse ref={eyeRightRef} cx="28" cy="18" rx="2.5" ry="3.5" fill="#01314a" />
            {/* Eye shine */}
            <circle cx="17" cy="16.5" r="0.8" fill="rgba(255,255,255,0.9)" />
            <circle cx="29" cy="16.5" r="0.8" fill="rgba(255,255,255,0.9)" />
          </g>

          {/* Mouth */}
          <path d="M 19 26 Q 22 28 25 26" fill="none"
            stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Speech bubble */}
      <span ref={speechRef} className="haro__speech" />
    </div>
  );
}
