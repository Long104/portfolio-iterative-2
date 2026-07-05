import { refractive, convex } from "refractive";
import { IS_CHROME } from "../lib/env";

// Spread into config only on non-Chrome to skip html2canvas entirely.
const SIMPLE_FALLBACK = IS_CHROME ? {} : { fallbackMode: "simple" as const };

export const RefractiveDiv = refractive.div;

// ── Glass config builders ──
// Different element sizes need different optical properties.
// All use bezelHeightFn: convex (squircle) — Apple's signature curve.

/** Large panel (About, Experience sections) */
export function buildPanelConfig(specularAngle: number) {
  return {
    radius: 28, blur: 3, glassThickness: 110, bezelWidth: 26,
    refractiveIndex: 1.5, specularOpacity: 0.8, specularAngle,
    bezelHeightFn: convex,
    ...SIMPLE_FALLBACK,
  };
}

/** Navigation bar / medium card (NavPill, ProjectCard) */
export function buildNavConfig(specularAngle: number) {
  return {
    radius: 22, blur: 2, glassThickness: 80, bezelWidth: 22,
    refractiveIndex: 1.5, specularOpacity: 0.7, specularAngle,
    bezelHeightFn: convex,
    ...SIMPLE_FALLBACK,
  };
}

/** Project detail overlay — deeper blur for readability over vortex, thicker glass for presence */
export function buildDetailConfig(specularAngle: number) {
  return {
    radius: 28, blur: 6, glassThickness: 140, bezelWidth: 30,
    refractiveIndex: 1.5, specularOpacity: 0.85, specularAngle,
    bezelHeightFn: convex,
    ...SIMPLE_FALLBACK,
  };
}

/** Small control (Audio bar) */
export function buildSmallConfig(specularAngle: number) {
  return {
    radius: 18, blur: 1, glassThickness: 60, bezelWidth: 16,
    refractiveIndex: 1.5, specularOpacity: 0.6, specularAngle,
    bezelHeightFn: convex,
    ...SIMPLE_FALLBACK,
  };
}

/** Circular button (Hamburger menu — radius at half of 52px = near circle) */
export function buildCircleConfig(specularAngle: number) {
  return {
    radius: 26, blur: 1, glassThickness: 60, bezelWidth: 16,
    refractiveIndex: 1.5, specularOpacity: 0.6, specularAngle,
    bezelHeightFn: convex,
    ...SIMPLE_FALLBACK,
  };
}
