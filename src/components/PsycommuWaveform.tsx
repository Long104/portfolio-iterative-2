// ── Psycommu Waveform Monitor ──
// Real-time audio waveform drawn on a tiny canvas.
// Sits inside the audio bar — pulses with bass, shimmers with treble.
// Color gradient: bass (magenta) → mid (violet) → treble (cyan).

import { useEffect, useRef } from "react";
import { getAudioData } from "../useAudioEngine";
import { MAX_DPR } from "../perf";

const W = 100;
const H = 24;
const DPR = Math.min(2, MAX_DPR);

// Pre-computed waveform gradient — identical every frame, no need to recreate
const WAVE_GRAD_STOPS: [number, string][] = [
  [0, "rgba(255, 75, 216, 0.9)"],
  [0.5, "rgba(139, 92, 246, 0.8)"],
  [1, "rgba(27, 188, 178, 0.9)"],
];

export function PsycommuWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const c = ctx; // narrowed: non-null after guard above
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    c.scale(DPR, DPR);

    let raf = 0;
    let lastNonZero = false;
    let lastFrameTime = 0; // 30fps throttle
    let cachedGrad: CanvasGradient | null = null;

    function draw() {
      raf = requestAnimationFrame(draw);

      // 30fps throttle — waveform updates at 30fps are visually identical to 60fps
      const now = performance.now();
      if (now - lastFrameTime < 33) return;
      lastFrameTime = now;

      const data = getAudioData();

      // Skip paint when audio is silent (bass, mid, treble all zero)
      const hasAudio = data.bass > 0 || data.mid > 0 || data.treble > 0;
      if (!hasAudio) {
        if (lastNonZero) {
          c.clearRect(0, 0, W, H);
          lastNonZero = false;
        }
        return;
      }
      lastNonZero = true;

      c.clearRect(0, 0, W, H);

      // ── Background bar (subtle track) ──
      c.fillStyle = "rgba(255, 255, 255, 0.03)";
      c.fillRect(0, H / 2 - 0.5, W, 1);

      // ── Waveform ──
      const time = performance.now() / 1000;
      const steps = 48;
      const stepW = W / steps;
      const centerY = H / 2;

      c.beginPath();
      c.moveTo(0, centerY);

      for (let i = 0; i <= steps; i++) {
        const x = i * stepW;
        const t = i / steps;

        // Mix frequency bands with position-based weighting
        // Bass dominates left, treble dominates right
        const bassWeight = 1 - t;
        const trebleWeight = t;
        const midWeight = 0.5;

        const amplitude =
          data.bass * bassWeight * 8 +
          data.mid * midWeight * 5 +
          data.treble * trebleWeight * 4;

        // Add subtle phase shift for organic movement
        const phase = Math.sin(time * 3 + i * 0.4) * 0.3;
        const y = centerY + (amplitude + phase) * (i % 2 === 0 ? -1 : 1);

        c.lineTo(x, y);
      }

      // Color transitions from magenta (left) → cyan (right)
      if (!cachedGrad) {
        cachedGrad = c.createLinearGradient(0, 0, W, 0);
        for (const [offset, color] of WAVE_GRAD_STOPS) cachedGrad.addColorStop(offset, color);
      }
      c.strokeStyle = cachedGrad;
      c.lineWidth = 1.5;
      c.stroke();

      // ── Glow dots at frequency peaks ──
      const peaks = [
        { idx: 8, color: "rgba(255, 75, 216, 0.6)" },   // bass
        { idx: 24, color: "rgba(139, 92, 246, 0.5)" },    // mid
        { idx: 40, color: "rgba(27, 188, 178, 0.6)" },   // treble
      ];

      for (const p of peaks) {
        const px = p.idx * stepW;
        const amp =
          p.idx === 8
            ? data.bass * 8
            : p.idx === 24
              ? data.mid * 5
              : data.treble * 4;
        const py = centerY + (amp + Math.sin(time * 4 + p.idx) * 0.3) * (p.idx % 2 === 0 ? -1 : 1);

        c.beginPath();
        c.arc(px, py, 2 + amp * 0.5, 0, Math.PI * 2);
        c.fillStyle = p.color;
        c.fill();
      }
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width: W,
        height: H,
        opacity: 0.7,
        flexShrink: 0,
      }}
    />
  );
}
