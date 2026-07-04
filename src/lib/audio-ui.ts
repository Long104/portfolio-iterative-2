// ── UI Sound Effects — Gundam cockpit aesthetic ──
// Procedural Web Audio tones. No audio files, zero network cost.
//
// Sound palette:
//   hover  → radar lock-on ping (short, high, subtle)
//   click  → cockpit switch pop (percussive, mechanical)
//   open   → system power-up arpeggio (rising 3-note chime)
//   close  → system shutdown (descending slide)
//   nav    → radar sweep (soft triangle whoosh)
//
// All sounds are quiet (~-16dB peak) — tactile feedback, not a soundtrack.
// Silently no-ops when prefers-reduced-motion is set.
//
// IMPORTANT: call initAudioUI() inside a trusted user gesture (e.g., LAUNCH click)
// so the AudioContext is created in a non-suspended state. Otherwise the
// browser may reject AudioContext creation/resume from hover/keyboard events.

// ── Safety gate: reduced motion ──
const PREFERS_REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Audio bus singleton ──
let ctx: AudioContext | null = null;
let initAttempted = false;

/**
 * Call inside a trusted user gesture (LAUNCH click) to create + resume
 * the AudioContext before any hover/keyboard events fire.
 */
export function initAudioUI(): void {
  if (PREFERS_REDUCED_MOTION || initAttempted) return;
  initAttempted = true;
  ctx = new AudioContext();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // Resume failed — sounds will fail silently, which is acceptable.
    });
  }
}

function getCtx(): AudioContext | null {
  if (PREFERS_REDUCED_MOTION) return null;
  if (!ctx) return null; // not initialised (call initAudioUI in a click handler)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// ── Oscillator tone (shared by all UI sounds) ──
function tone(
  freq: number,
  endFreq: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  startTime?: number,
) {
  const c = getCtx();
  if (!c) return;
  const t = startTime ?? c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 20), t + duration);
  }
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

// ── Radar lock-on ping ──
// Short sine blip with subtle vibrato — sounds like distant radar echo.
export function playHoverSound(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  // Base frequency with light vibrato (FM at ~40Hz)
  osc.frequency.setValueAtTime(1000, t);
  osc.frequency.linearRampToValueAtTime(1400, t + 0.04);
  const vibrato = c.createOscillator();
  vibrato.frequency.value = 40;
  vibrato.type = "sine";
  const vibratoGain = c.createGain();
  vibratoGain.gain.value = 15; // ±15Hz wobble
  vibrato.connect(vibratoGain).connect(osc.frequency);
  vibrato.start(t);
  vibrato.stop(t + 0.08);

  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.09);
}

// ── Cockpit switch click ──
export function playClickSound(): void {
  tone(600, 300, 0.06, 0.12, "sine");
}

// ── System power-up arpeggio (open overlay) ──
// Three rising notes: 300Hz → 600Hz → 1000Hz, each 50ms apart.
export function playOpenSound(): void {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(300, 300, 0.05, 0.10, "sine", t);
  tone(600, 600, 0.05, 0.10, "sine", t + 0.04);
  tone(1000, 1000, 0.08, 0.08, "sine", t + 0.08);
}

// ── System shutdown (close overlay) ──
// Slow descending slide — 800Hz → 200Hz over 150ms.
export function playCloseSound(): void {
  tone(800, 200, 0.15, 0.08, "sine");
}
