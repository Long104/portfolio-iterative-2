// ── Tactical Radar Minimap ──
// Gundam cockpit-style circular radar showing section positions.
// Active section blip pulses green. Sweeping teal radar line.
// Canvas-based, own rAF loop throttled to ~20fps.
// Desktop only (hidden on mobile/tablet via CSS).

import { useEffect, useRef } from "react";

interface TacticalRadarProps {
  activeSection: number;
  totalSections: number;
}

export function TacticalRadar({ activeSection, totalSections }: TacticalRadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(activeSection);

  useEffect(() => {
    activeRef.current = activeSection;
  }, [activeSection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    const c = rawCtx; // narrowed for closure use

    const size = 90;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    c.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 3;

    let rafId = 0;
    let sweepAngle = -Math.PI / 2;
    let lastDraw = 0;
    const SWEEP_SPEED = 0.018;
    const THROTTLE_MS = 50;

    function draw(t: number) {
      rafId = requestAnimationFrame(draw);
      if (t - lastDraw < THROTTLE_MS) return;
      lastDraw = t;
      sweepAngle += SWEEP_SPEED;

      const active = activeRef.current;
      const pulse = Math.sin(t * 0.004) * 0.3 + 0.7;

      c.clearRect(0, 0, size, size);

      // Background circle
      c.fillStyle = "rgba(0, 0, 0, 0.35)";
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fill();

      // Concentric grid circles
      c.strokeStyle = "rgba(255, 75, 216, 0.12)";
      c.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        c.beginPath();
        c.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
        c.stroke();
      }

      // Crosshair
      c.beginPath();
      c.moveTo(cx - r, cy);
      c.lineTo(cx + r, cy);
      c.moveTo(cx, cy - r);
      c.lineTo(cx, cy + r);
      c.stroke();

      // Sweep wedge
      const sweepGrad = c.createLinearGradient(
        cx, cy,
        cx + Math.cos(sweepAngle) * r,
        cy + Math.sin(sweepAngle) * r,
      );
      sweepGrad.addColorStop(0, "rgba(27, 188, 178, 0.35)");
      sweepGrad.addColorStop(1, "rgba(27, 188, 178, 0)");
      c.fillStyle = sweepGrad;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, r, sweepAngle - 0.5, sweepAngle);
      c.closePath();
      c.fill();

      // Section blips
      for (let i = 0; i < totalSections; i++) {
        const angle = (i / totalSections) * Math.PI * 2 - Math.PI / 2;
        const dotR = r * 0.62;
        const x = cx + Math.cos(angle) * dotR;
        const y = cy + Math.sin(angle) * dotR;

        if (i === active) {
          c.fillStyle = `rgba(74, 222, 128, ${pulse})`;
          c.shadowColor = "rgba(74, 222, 128, 0.6)";
          c.shadowBlur = 6;
          c.beginPath();
          c.arc(x, y, 3, 0, Math.PI * 2);
          c.fill();
          c.shadowBlur = 0;
        } else {
          c.fillStyle = "rgba(255, 255, 255, 0.25)";
          c.beginPath();
          c.arc(x, y, 1.5, 0, Math.PI * 2);
          c.fill();
        }
      }

      // Center dot
      c.fillStyle = "rgba(255, 75, 216, 0.5)";
      c.beginPath();
      c.arc(cx, cy, 1.5, 0, Math.PI * 2);
      c.fill();

      // Border ring
      c.strokeStyle = "rgba(255, 255, 255, 0.08)";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.stroke();
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [totalSections]);

  return (
    <div className="tactical-radar" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
