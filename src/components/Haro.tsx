// ── Companion Robot: "ORBIT" ──
// Floating mecha drone with simple dash eyes "- -".
// Pure SVG + GSAP — floats, blinks, narrates section changes.

import { useEffect, useRef } from "react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { getMouseState } from "../mouseStore";

const NARRATION = [
  "// pilot profile loaded",
  "// engineering × visual art",
  "// combat record accessed",
  "// mission archive — targets detected",
  "// system status readout",
  "// communication channel open",
] as const;

interface Props {
  sectionIndex: number;
}

export function Haro({ sectionIndex }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const eyeLRef = useRef<SVGLineElement>(null);
  const eyeRRef = useRef<SVGLineElement>(null);
  const antLRef = useRef<SVGPathElement>(null);
  const antRRef = useRef<SVGPathElement>(null);
  const speechRef = useRef<HTMLSpanElement>(null);
  const prevSection = useRef(-1);

  // ── Gentle float ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const el = bodyRef.current;
    if (!el) return;
    gsap.to(el, { y: -5, duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, []);

  // ── Random blink (opacity fade) ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => { blink(); schedule(); }, 2000 + Math.random() * 4000);
    }
    function blink() {
      const eyes = [eyeLRef.current, eyeRRef.current].filter(Boolean);
      if (!eyes.length) return;
      gsap.timeline()
        .to(eyes, { opacity: 0, duration: 0.04 })
        .to(eyes, { opacity: 1, duration: 0.08, ease: "power2.out" });
    }
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // ── Cursor tracking (antenna tilt + subtle eye shift) ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const eL = eyeLRef.current;
    const eR = eyeRRef.current;
    const aL = antLRef.current;
    const aR = antRRef.current;
    if (!eL || !eR || !aL || !aR) return;
    const eyeLEl = eL;
    const eyeREl = eR;
    const antLEl = aL;
    const antREl = aR;

    let last = 0;
    function tick(t: number) {
      if (t - last < 80) return;
      last = t;
      const { y } = getMouseState();
      const dy = -y * 1.2;
      // Eyes shift vertically with cursor
      eyeLEl.setAttribute("y1", String(22 + dy));
      eyeLEl.setAttribute("y2", String(22 + dy));
      eyeREl.setAttribute("y1", String(22 + dy));
      eyeREl.setAttribute("y2", String(22 + dy));
      // Antenna tilt
      const { x } = getMouseState();
      const tilt = x * 3;
      antLEl.setAttribute("transform", `rotate(${-tilt} 14 16)`);
      antREl.setAttribute("transform", `rotate(${tilt} 34 16)`);
    }
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // ── Section change: eye flash + antenna twitch + speech ──
  useEffect(() => {
    if (prevSection.current === sectionIndex) return;
    prevSection.current = sectionIndex;

    const eL = eyeLRef.current;
    const eR = eyeRRef.current;
    const aL = antLRef.current;
    const aR = antRRef.current;
    const speech = speechRef.current;
    if (!eL || !eR || !aL || !aR || !speech) return;

    const text = NARRATION[sectionIndex] ?? "";

    if (PREFERS_REDUCED_MOTION) {
      speech.textContent = text;
      return;
    }

    // Eyes flash magenta
    const eyes = [eL, eR];
    gsap.timeline()
      .to(eyes, { attr: { stroke: "#FF4FD8" }, duration: 0.08 })
      .to(eyes, { attr: { stroke: "rgba(255,255,255,0.9)" }, duration: 0.3, delay: 0.12 });

    // Antenna twitch
    const ants = [aL, aR];
    gsap.timeline()
      .to(ants, { rotation: 6, duration: 0.06, transformOrigin: "14px 16px" })
      .to(ants, { rotation: -4, duration: 0.05 })
      .to(ants, { rotation: 0, duration: 0.04 });

    // Type speech
    speech.textContent = "";
    const proxy = { n: 0 };
    gsap.to(proxy, {
      n: text.length,
      duration: text.length * 0.022,
      ease: "none",
      onUpdate: () => { speech.textContent = text.slice(0, Math.round(proxy.n)); },
    });
  }, [sectionIndex]);

  return (
    <div className="haro" aria-hidden="true">
      <div ref={bodyRef} className="haro__body">
        <svg width="48" height="46" viewBox="0 0 48 46" fill="none">
          <defs>
            <radialGradient id="body-grad" cx="35%" cy="25%" r="80%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="60%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </radialGradient>
            <linearGradient id="ant-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6ee7b7" />
            </linearGradient>
          </defs>

          {/* ── Antenna ears ── */}
          <path ref={antLRef} d="M 14 16 L 8 5 L 10 4 L 16 15 Z" fill="url(#ant-grad)" />
          <path ref={antRRef} d="M 34 16 L 40 5 L 38 4 L 32 15 Z" fill="url(#ant-grad)" />
          <circle cx="9" cy="4.5" r="1.2" fill="#6ee7b7" opacity="0.6" />
          <circle cx="39" cy="4.5" r="1.2" fill="#6ee7b7" opacity="0.6" />

          {/* ── Main body ── */}
          <path d="M 14 16 Q 24 13 34 16 Q 42 19 43 28 Q 43 38 34 42 Q 24 44 14 42 Q 5 38 5 28 Q 5 19 14 16 Z"
            fill="url(#body-grad)"
            style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.2))" }} />

          {/* ── Panel details ── */}
          <path d="M 8 22 Q 24 17 40 22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
          <path d="M 9 34 Q 24 38 39 34" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.6" />

          {/* ── Side thruster vents ── */}
          <rect x="6" y="26" width="2" height="6" rx="1" fill="rgba(0,0,0,0.2)" />
          <rect x="40" y="26" width="2" height="6" rx="1" fill="rgba(0,0,0,0.2)" />
          <rect x="6.5" y="27" width="1" height="4" rx="0.5" fill="rgba(74,222,128,0.3)" />
          <rect x="40.5" y="27" width="1" height="4" rx="0.5" fill="rgba(74,222,128,0.3)" />

          {/* ── Eyes: "- -" ── */}
          <line ref={eyeLRef} x1="15" y1="22" x2="19" y2="22"
            stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />
          <line ref={eyeRRef} x1="29" y1="22" x2="33" y2="22"
            stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" />

          {/* ── Mouth / status bar ── */}
          <rect x="20" y="35" width="8" height="1.5" rx="0.75" fill="rgba(0,0,0,0.15)" />

          {/* ── Indicator light ── */}
          <circle cx="24" cy="39.5" r="1.2" fill="#6ee7b7" opacity="0.5" />
        </svg>
      </div>

      <span ref={speechRef} className="haro__speech" />
    </div>
  );
}
