import { PERF_TIER } from "../perf";

// Shared refraction config — liquid glass effect
// Mobile uses "simple" mode (just blur) to save GPU for the WebGL vortex
const isMobile = PERF_TIER === "mobile";

export const refraction = {
  radius: 16,
  blur: 4,
  bezelWidth: 10,
  glassThickness: 60,
  refractiveIndex: 1.5,
  specularOpacity: 0.4,
  specularAngle: Math.PI / 4,
  renderMode: isMobile ? ("simple" as const) : ("auto" as const),
};
