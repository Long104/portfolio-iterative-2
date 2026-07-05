// ── Circular audio visualizer (psycommu scanner) ──
// 48 bars radiate from center, driven by frequency data.
// Slowly rotates (~8s/rev) like a cockpit radar dish.
// Baseline ring + center dot stay visible when audio is silent.
// Optimized: uses useAudioCanvas hook to encapsulate frame loop,
// 30fps throttle, audio idle gating, and resize logic.

import { useMemo, useRef } from "react";
import { MAX_DPR } from "../perf";
import { useAudioCanvas } from "../hooks/useAudioCanvas";

const SIZE = 56;
const DPR = Math.min(2, MAX_DPR);
const BARS = 48;
const RADIUS = 16;          // baseline ring radius
const MAX_BAR_LEN = 10;     // max extension beyond ring
const ROTATION_SPEED = 0.125; // radians/sec (~8s per revolution)
const CENTER = SIZE / 2;

export function CircularVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);

  const setup = useMemo(() => ({ width: SIZE, height: SIZE, dpr: DPR }), []);

  useAudioCanvas(canvasRef, setup, (c, data, dt) => {
    const hasAudio = data.bass > 0 || data.mid > 0 || data.treble > 0;

    c.clearRect(0, 0, SIZE, SIZE);

    if (hasAudio) {
      rotationRef.current += ROTATION_SPEED * dt;
    }
    const rotation = rotationRef.current;

    // Baseline ring (always visible)
    c.beginPath();
    c.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    c.strokeStyle = "rgba(255, 255, 255, 0.12)";
    c.lineWidth = 1;
    c.stroke();

    // Frequency-reactive bars
    for (let i = 0; i < BARS; i++) {
      const angle = (i / BARS) * Math.PI * 2 + rotation;

      // Position-based frequency weighting:
      // Bottom of circle = bass-heavy, top = treble-heavy
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const bassWeight = Math.max(0, Math.sin(normAngle));
      const trebleWeight = Math.max(0, -Math.sin(normAngle));
      const midWeight = 0.5;

      const amplitude =
        data.bass * bassWeight * 1.2 +
        data.mid * midWeight * 0.8 +
        data.treble * trebleWeight * 0.6;

      const barLen = hasAudio ? amplitude * MAX_BAR_LEN : 0;

      const x1 = CENTER + Math.cos(angle) * RADIUS;
      const y1 = CENTER + Math.sin(angle) * RADIUS;
      const x2 = CENTER + Math.cos(angle) * (RADIUS + barLen);
      const y2 = CENTER + Math.sin(angle) * (RADIUS + barLen);

      // Color by angle: magenta → violet → cyan
      const t = i / BARS;
      const r = Math.round(255 * (1 - t * 0.9));
      const g = Math.round(75 + t * 115);
      const b = Math.round(216 - t * 28);
      const alpha = hasAudio ? 0.85 : 0;

      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      c.lineWidth = 1;
      c.stroke();
    }

    // Center dot
    c.beginPath();
    c.arc(CENTER, CENTER, 1.5, 0, Math.PI * 2);
    c.fillStyle = hasAudio ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.3)";
    c.fill();
  });

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
      }}
    />
  );
}
