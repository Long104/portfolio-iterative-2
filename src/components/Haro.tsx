// ── Companion Robot: "ORBIT" ──
// Original design — an angular recon drone with a single hexagonal camera eye.
// Distinct from any existing IP. Pure SVG + GSAP.
// Floats, blinks (shutter-style), tracks cursor, narrates section changes.

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
  const eyeRef = useRef<SVGPolygonElement>(null);
  const irisRef = useRef<SVGCircleElement>(null);
  const antennaLeftRef = useRef<SVGPathElement>(null);
  const antennaRightRef = useRef<SVGPathElement>(null);
  const speechRef = useRef<HTMLSpanElement>(null);
  const prevSection = useRef(-1);

  // ── Gentle float ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const el = bodyRef.current;
    if (!el) return;
    gsap.to(el, { y: -5, duration: 2.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }, []);

  // ── Random blink (shutter close) ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => { blink(); schedule(); }, 2000 + Math.random() * 4000);
    }
    function blink() {
      const eye = eyeRef.current;
      if (!eye) return;
      gsap.timeline()
        .to(eye, { scaleY: 0.1, duration: 0.04, ease: "power2.in", transformOrigin: "24px 24px" })
        .to(eye, { scaleY: 1, duration: 0.06, ease: "power2.out", transformOrigin: "24px 24px" });
    }
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // ── Eye / antenna cursor tracking ──
  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    const iris = irisRef.current;
    const antL = antennaLeftRef.current;
    const antR = antennaRightRef.current;
    if (!iris || !antL || !antR) return;
    const irisEl: SVGCircleElement = iris;
    const antLEl: SVGPathElement = antL;
    const antREl: SVGPathElement = antR;

    let last = 0;
    function tick(t: number) {
      if (t - last < 80) return;
      last = t;
      const { x, y } = getMouseState();
      // Iris drifts within the hexagon eye
      irisEl.setAttribute("cx", String(24 + x * 1.5));
      irisEl.setAttribute("cy", String(24 + -y * 1));
      // Antenna tilt
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

    const eye = eyeRef.current;
    const antL = antennaLeftRef.current;
    const antR = antennaRightRef.current;
    const speech = speechRef.current;
    if (!eye || !antL || !antR || !speech) return;

    const text = NARRATION[sectionIndex] ?? "";

    if (PREFERS_REDUCED_MOTION) {
      speech.textContent = text;
      return;
    }

    // Eye flash magenta
    gsap.timeline()
      .to(eye, { attr: { fill: "#FF4FD8" }, duration: 0.08 })
      .to(eye, { attr: { fill: "#01314a" }, duration: 0.3, delay: 0.12 });

    // Antenna twitch
    gsap.timeline()
      .to([antL, antR], { rotation: 6, duration: 0.06, transformOrigin: "14px 16px" })
      .to([antL, antR], { rotation: -4, duration: 0.05 })
      .to([antL, antR], { rotation: 0, duration: 0.04 });

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
            <linearGradient id="panel-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
            </linearGradient>
          </defs>

          {/* ── Antenna ears ── */}
          <path ref={antennaLeftRef} d="M 14 16 L 8 5 L 10 4 L 16 15 Z" fill="url(#ant-grad)" />
          <path ref={antennaRightRef} d="M 34 16 L 40 5 L 38 4 L 32 15 Z" fill="url(#ant-grad)" />
          {/* Antenna tips glow */}
          <circle cx="9" cy="4.5" r="1.2" fill="#6ee7b7" opacity="0.6" />
          <circle cx="39" cy="4.5" r="1.2" fill="#6ee7b7" opacity="0.6" />

          {/* ── Main body — mechanical rounded hexagon ── */}
          <path d="M 14 16 Q 24 13 34 16 Q 42 19 43 28 Q 43 38 34 42 Q 24 44 14 42 Q 5 38 5 28 Q 5 19 14 16 Z"
            fill="url(#body-grad)"
            style={{ filter: "drop-shadow(0 0 6px rgba(74,222,128,0.2))" }} />

          {/* ── Body panel details ── */}
          {/* Upper panel curve */}
          <path d="M 8 22 Q 24 17 40 22" fill="none" stroke="url(#panel-grad)" strokeWidth="0.8" />
          {/* Lower panel curve */}
          <path d="M 9 34 Q 24 38 39 34" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="0.6" />
          {/* Side panel lines */}
          <line x1="6" y1="24" x2="5" y2="30" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          <line x1="42" y1="24" x2="43" y2="30" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          {/* Center vertical panel line */}
          <line x1="24" y1="15" x2="24" y2="20" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />

          {/* ── Side thruster vents ── */}
          <rect x="6" y="26" width="2" height="6" rx="1" fill="rgba(0,0,0,0.2)" />
          <rect x="40" y="26" width="2" height="6" rx="1" fill="rgba(0,0,0,0.2)" />
          {/* Vent glow */}
          <rect x="6.5" y="27" width="1" height="4" rx="0.5" fill="rgba(74,222,128,0.3)" />
          <rect x="40.5" y="27" width="1" height="4" rx="0.5" fill="rgba(74,222,128,0.3)" />

          {/* ── Indicator light ── */}
          <circle cx="24" cy="38" r="1.5" fill="#6ee7b7" opacity="0.5" />

          {/* ── Hexagonal camera eye ── */}
          <polygon ref={eyeRef}
            points={hexagonPoints()}
            fill="#01314a"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="0.8" />

          {/* ── Iris / pupil ── */}
          <circle ref={irisRef} cx="24" cy="24" r="3" fill="rgba(255,255,255,0.9)" />
          <circle cx="24" cy="24" r="1.5" fill="#01314a" />

          {/* ── Eye crosshair overlay ── */}
          <line x1="17" y1="24" x2="31" y2="24" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
          <line x1="24" y1="17" x2="24" y2="31" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />

          {/* ── Mouth / status bar (tiny) ── */}
          <rect x="20" y="35" width="8" height="1.5" rx="0.75" fill="rgba(0,0,0,0.15)" />
        </svg>
      </div>

      {/* ── Speech bubble ── */}
      <span ref={speechRef} className="haro__speech" />
    </div>
  );
}

// ── Hexagon point generator ──
function hexagonPoints(): string {
  const cx = 24, cy = 24, r = 8;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6; // flat-top hexagon
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}
