// ── useAudioCanvas Hook ──
// Encapsulates rAF loop, 30fps rendering throttle, audio idle gating
// (pausing loop when silent, restarting via interval check), canvas dimension
// setup, and automatic resource cleanup. Used to deduplicate boilerplate
// across 2D audio visualizer components.

import { useEffect, useRef, type RefObject } from "react";
import { getAudioData } from "../useAudioEngine";
import type { AudioData } from "../audio";

interface Setup {
  width: number;
  height: number;
  dpr: number;
}

export function useAudioCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  setup: Setup,
  draw: (ctx: CanvasRenderingContext2D, data: AudioData, dt: number) => void,
) {
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply DPR setup
    const { width, height, dpr } = setup;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const context = ctx;
    context.scale(dpr, dpr);

    let raf = 0;
    let audioWatch = 0;
    let lastFrameTime = 0;

    function loop() {
      raf = requestAnimationFrame(loop);

      const now = performance.now();
      if (now - lastFrameTime < 33) return; // 30fps throttle

      const dt = lastFrameTime > 0 ? (now - lastFrameTime) / 1000 : 0.033;
      lastFrameTime = now;

      const data = getAudioData();
      const hasAudio = data.bass > 0 || data.mid > 0 || data.treble > 0;

      // Draw frame
      drawRef.current(context, data, dt);

      // ── Idle Gate: stop loop when no audio is playing ──
      // Checks every 500ms to wake up when audio starts.
      if (!hasAudio) {
        cancelAnimationFrame(raf);
        raf = 0;
        audioWatch = window.setInterval(() => {
          const d = getAudioData();
          if (d.bass > 0 || d.mid > 0 || d.treble > 0) {
            window.clearInterval(audioWatch);
            audioWatch = 0;
            lastFrameTime = 0;
            raf = requestAnimationFrame(loop);
          }
        }, 500);
      }
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (audioWatch) window.clearInterval(audioWatch);
    };
  }, [canvasRef, setup.width, setup.height, setup.dpr]);
}
