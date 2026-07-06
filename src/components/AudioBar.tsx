// ── AudioBar — Psycommu control panel ──
// Sliding active indicator + play/pause/track switch micro-interactions.

import { useRef, useEffect, useMemo } from "react";
import { RefractiveDiv, buildSmallConfig } from "./glass-configs";
import { useDeviceOrientation } from "../useDeviceOrientation";
import { TRACKS } from "../useAudioEngine";
import { gsap } from "../lib/gsap";
import { useSlidingIndicator } from "../hooks/useSlidingIndicator";

interface AudioBarProps {
  isPlaying: boolean;
  currentTrack: string;
  theme: string;
  toggle: () => void;
  handleSelectTrack: (url: string) => void;
  onToggleTheme: () => void;
}

export function AudioBar({
  isPlaying,
  currentTrack,
  theme,
  toggle,
  handleSelectTrack,
  onToggleTheme,
}: AudioBarProps) {
  const specularAngle = useDeviceOrientation();
  const refraction = useMemo(() => buildSmallConfig(specularAngle), [specularAngle]);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLButtonElement[]>([]);
  const playBtnRef = useRef<HTMLButtonElement>(null);

  // ── Sliding indicator ──
  const activeTrackIndex = TRACKS.findIndex((t) => t.url === currentTrack);
  useSlidingIndicator(indicatorRef, itemsRef, activeTrackIndex);

  // ── Play button micro-interaction ──
  useEffect(() => {
    const btn = playBtnRef.current;
    if (!btn) return;
    const el = btn;
    const canHover = window.matchMedia("(hover: hover)").matches;

    function onDown() { gsap.to(el, { scale: 0.85, duration: 0.1, ease: "power2.out" }); }
    function onUp() { gsap.to(el, { scale: 1, duration: 0.3, ease: "back.out(3)" }); }

    function onMove(e: MouseEvent) {
      if (!canHover) return;
      const rect = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (rect.left + rect.width / 2)) * 0.3,
        y: (e.clientY - (rect.top + rect.height / 2)) * 0.3,
        duration: 0.4,
        ease: "power3.out",
      });
    }
    function onLeave() {
      gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    }

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onUp);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <RefractiveDiv
      className="audio-bar"
      refraction={refraction}
    >
      <button
        ref={playBtnRef}
        className="audio-bar__btn"
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "\u23F8" : "\u25B6"}
      </button>

      <div className="audio-bar__divider" />

      <div className="audio-bar__segmented">
        {/* Sliding active indicator */}
        <div ref={indicatorRef} className="audio-bar__indicator" />
        {TRACKS.map((track, i) => (
          <button
            key={track.url}
            ref={(el) => { if (el) itemsRef.current[i] = el; }}
            className={
              "audio-bar__track" +
              (currentTrack === track.url ? " audio-bar__track--active" : "")
            }
            onClick={() => handleSelectTrack(track.url)}
          >
            {track.name}
          </button>
        ))}
      </div>

      <div className="audio-bar__divider" />

      <button
        className="audio-bar__theme"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "gquuuuuux" ? "GFreD" : "GQuuuuuuX"} theme`}
      >
        {theme === "gquuuuuux" ? "gMS-Ω" : "gMS-κ"}
      </button>
    </RefractiveDiv>
  );
}
