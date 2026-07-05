// ── Psycommu waveform monitor ──
// Real-time audio waveform drawn on a tiny canvas.
// Sits inside the audio bar — pulses with bass, shimmers with treble.
// Color gradient: bass (magenta) → mid (violet) → treble (cyan).
// Optimized: uses useAudioCanvas hook to encapsulate frame loop,
// 30fps throttle, audio idle gating, and resize logic.

import { useMemo, useRef } from "react";
import { MAX_DPR } from "../perf";
import { useAudioCanvas } from "../hooks/useAudioCanvas";

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
  const cachedGradRef = useRef<CanvasGradient | null>(null);

  const setup = useMemo(() => ({ width: W, height: H, dpr: DPR }), []);

  useAudioCanvas(canvasRef, setup, (c, data) => {
    c.clearRect(0, 0, W, H);

    // ── Baseline track ──
    c.fillStyle = "rgba(255, 255, 255, 0.03)";
    c.fillRect(0, H / 2 - 0.5, W, 1);

    // Draw waveform
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

      // Phase shift for organic wobble
      const phase = Math.sin(time * 3 + i * 0.4) * 0.3;
      const y = centerY + (amplitude + phase) * (i % 2 === 0 ? -1 : 1);

      c.lineTo(x, y);
    }

    // Color transitions from magenta (left) → cyan (right)
    if (!cachedGradRef.current) {
      const grad = c.createLinearGradient(0, 0, W, 0);
      for (const [offset, color] of WAVE_GRAD_STOPS) grad.addColorStop(offset, color);
      cachedGradRef.current = grad;
    }
    c.strokeStyle = cachedGradRef.current;
    c.lineWidth = 1.5;
    c.stroke();
  });

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
