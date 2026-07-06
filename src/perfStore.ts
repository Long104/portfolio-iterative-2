import { useSyncExternalStore } from "react";
import { PERF_TIER as staticTier } from "./perf";
import type { PerfTier } from "./perf";

export type QualityOverride = "auto" | "low" | "high";

export interface QualitySettings {
  tier: PerfTier;
  paintCount: number;
  flareCount: number;
  maxDpr: number;
}

export const TIER_SETTINGS: Record<PerfTier, QualitySettings> = {
  mobile: {
    tier: "mobile",
    paintCount: 4000,
    flareCount: 1000,
    maxDpr: 1.0,
  },
  tablet: {
    tier: "tablet",
    paintCount: 5000,
    flareCount: 1500,
    maxDpr: 1.0,
  },
  low: {
    tier: "low",
    paintCount: 6500,
    flareCount: 2000,
    maxDpr: 1.0,
  },
  high: {
    tier: "high",
    paintCount: 10000,
    flareCount: 3500,
    maxDpr: 1.0,
  },
};

// Initial state helpers
const getSavedOverride = (): QualityOverride => {
  if (typeof window === "undefined") return "auto";
  const saved = localStorage.getItem("kira-quality");
  if (saved === "low" || saved === "high" || saved === "auto") {
    return saved;
  }
  return "auto";
};

const getInitialTier = (override: QualityOverride): PerfTier => {
  if (override === "low") return "low";
  if (override === "high") return "high";
  
  // Under "auto", start high-spec machines at "low" to be conservative
  if (staticTier === "high") return "low";
  return staticTier;
};

let currentOverride = getSavedOverride();
let currentTier = getInitialTier(currentOverride);

// Listeners for pub/sub
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((l) => l());
};

// Stats tracking for dynamic watchdogs
const fpsHistory: number[] = [];
const bootTime = performance.now();
const WARMUP_MS = 3500; // ignore first 3.5s for initial loading/jank
let lastActionTime = performance.now();
const COOLDOWN_MS = 3000; // wait 3s after any tier change before doing another
let hasDowngraded = false;
let hasUpgraded = false;

export const perfStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot() {
    return `${currentOverride}:${currentTier}`;
  },

  getState() {
    return {
      override: currentOverride,
      tier: currentTier,
      settings: TIER_SETTINGS[currentTier],
    };
  },

  setOverride(override: QualityOverride) {
    if (override === currentOverride) return;
    currentOverride = override;
    
    // Recalculate tier based on override
    if (override === "low") {
      currentTier = "low";
    } else if (override === "high") {
      currentTier = "high";
    } else {
      // Back to auto: reset to initial conservative tier
      currentTier = getInitialTier("auto");
      // Reset tracking flags
      hasDowngraded = false;
      hasUpgraded = false;
      fpsHistory.length = 0;
      lastActionTime = performance.now();
    }
    
    if (typeof window !== "undefined") {
      localStorage.setItem("kira-quality", override);
    }
    
    emit();
  },

  reportFPS(fps: number) {
    // Only perform dynamic throttling if override is "auto"
    if (currentOverride !== "auto") return;

    const now = performance.now();
    if (now - bootTime < WARMUP_MS) return; // skip warm-up
    if (now - lastActionTime < COOLDOWN_MS) return; // skip cooldown

    fpsHistory.push(fps);
    if (fpsHistory.length > 5) fpsHistory.shift(); // keep 5s history

    // Only process if we have at least 3 seconds of data
    if (fpsHistory.length < 3) return;

    // Calculate average FPS in history
    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

    // Upgrade trigger:
    // If we are currently "low" (conservative boot), static tier is "high",
    // we haven't upgraded or downgraded yet, and the average FPS is stable (>= 28)
    if (
      currentTier === "low" &&
      staticTier === "high" &&
      !hasUpgraded &&
      !hasDowngraded &&
      avgFps >= 28.0
    ) {
      currentTier = "high";
      hasUpgraded = true;
      lastActionTime = now;
      fpsHistory.length = 0; // reset history after action
      emit();
      return;
    }

    // Downgrade trigger:
    // If the average FPS drops below 22, downgrade a tier to rescue frame rate
    if (avgFps < 22.0) {
      let nextTier: PerfTier | null = null;
      if (currentTier === "high") {
        nextTier = "low";
      } else if (currentTier === "low") {
        nextTier = "tablet";
      } else if (currentTier === "tablet") {
        nextTier = "mobile";
      }

      if (nextTier) {
        currentTier = nextTier;
        hasDowngraded = true;
        lastActionTime = now;
        fpsHistory.length = 0; // reset history after action
        emit();
      }
    }
  }
};

export function usePerfSettings(): QualitySettings {
  // Subscribe to changes
  useSyncExternalStore(perfStore.subscribe, perfStore.getSnapshot);
  return TIER_SETTINGS[currentTier];
}

export function usePerfState() {
  useSyncExternalStore(perfStore.subscribe, perfStore.getSnapshot);
  return {
    override: currentOverride,
    tier: currentTier,
    setOverride: (o: QualityOverride) => perfStore.setOverride(o),
  };
}
