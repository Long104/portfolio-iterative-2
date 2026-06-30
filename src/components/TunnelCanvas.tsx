// ── Tunnel Canvas — Gundam Catapult Deck ──────────────────
// One-point perspective tunnel rendered on 2D canvas.
// Light particles flow toward the viewer in an infinite loop.
// Two phases: running (always) → done (fade out on LAUNCH click).
// Procedural pulse keeps it alive; real audio drives it when playing.

import { useEffect, useRef } from "react";
import { getAudioData } from "../useAudioEngine";

export type TunnelPhase = "running" | "done";

interface Props {
  phase: TunnelPhase;
}

const POOL_SIZE = 80;
const COLOR_A = "#FF4FD8"; // magenta — matches psycommu palette
const COLOR_B = "#1BBCB2"; // cyan
const COLOR_C = "#8B5CF6"; // violet
const TUNNEL_SPEED = 0.6; // constant — loops forever at this pace

interface Particle {
  x: number; // tunnel-space wall position (-1..1)
  y: number;
  z: number; // depth (0 = far, 1 = at viewer)
  color: string;
}

export function TunnelCanvas({ phase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<TunnelPhase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particle pool ──
    const pool: Particle[] = [];
    const colors = [COLOR_A, COLOR_B, COLOR_C];
    for (let i = 0; i < POOL_SIZE; i++) {
      pool.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: Math.random(),
        color: colors[i % 3],
      });
    }

    // ── State ──
    let tunnelAlpha = 1; // fades to 0 when done
    let elapsed = 0;
    let lastT = performance.now();
    let raf = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;
      elapsed += dt;

      const currentPhase = phaseRef.current;

      // ── Done: fade out, stop rendering ──
      if (currentPhase === "done") {
        tunnelAlpha = Math.max(tunnelAlpha - dt * 2, 0);
        if (tunnelAlpha <= 0.005) {
          ctx.clearRect(0, 0, w, h);
          return;
        }
      }

      // ── Procedural pulse (simulated audio when silent) ──
      const audio = getAudioData();
      const pulse = audio.bass > 0.01
        ? audio.bass
        : 0.5 + 0.5 * Math.sin(elapsed * 2.5);

      // ── Clear ──
      ctx.clearRect(0, 0, w, h);

      ctx.globalAlpha = tunnelAlpha;

      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.hypot(w, h) / 2;

      // ── Perspective grid — converging lines ──
      const gridAlpha = 0.06 + pulse * 0.04;
      ctx.strokeStyle = `rgba(255, 255, 255, ${gridAlpha})`;
      ctx.lineWidth = 1;
      const gridLines = 16;
      for (let i = 0; i < gridLines; i++) {
        const angle = (i / gridLines) * Math.PI * 2;
        const ex = cx + Math.cos(angle) * maxRadius;
        const ey = cy + Math.sin(angle) * maxRadius;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      // ── Depth rings ──
      const ringCount = 8;
      const ringOffset = (elapsed * TUNNEL_SPEED * 0.5) % 1;
      for (let i = 0; i < ringCount; i++) {
        const ringZ = ((i / ringCount) + ringOffset) % 1;
        const radius = ringZ * maxRadius;
        if (radius < 5) continue;
        const alpha = ringZ * (0.15 + pulse * 0.08);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 0.5 + ringZ * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── Light particles ──
      for (const p of pool) {
        p.z += TUNNEL_SPEED * dt;
        if (p.z > 1.2) {
          // Recycle to far
          p.x = (Math.random() - 0.5) * 2;
          p.y = (Math.random() - 0.5) * 2;
          p.z = 0;
        }

        // Project to screen
        const scale = p.z * p.z; // non-linear depth curve
        const sx = cx + p.x * scale * maxRadius * 0.7;
        const sy = cy + p.y * scale * maxRadius * 0.7;
        const size = scale * (2 + pulse * 3);
        const brightness = scale * (0.5 + pulse * 0.5);

        if (size < 0.1) continue;

        // Draw as dot with glow
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = brightness * tunnelAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = size * 3;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
