// ── Adaptive perf tier ──
// Cheap heuristic: UA + cores + RAM. Good enough before first frame;
// R3F `performance` prop then drops DPR further if FPS dips at runtime.
//
// Glow noise pre-baked to texture (Jun 2026) — ALU-heavy fbm/noise replaced
// with texture lookups. All tiers get a particle bump since glow is ~10× cheaper.
//
// Four tiers:
//   mobile — phones (30fps, 1.0 DPR, 7000 particles, smooth orientation)
//   tablet — iPads, Android tablets (30fps, 1.25 DPR, 8000 particles, smooth)
//   low    — low-end desktops (30fps, 1.25 DPR, 6500 particles, smooth)
//   high   — high-end desktops (30fps, 1.25 DPR, 10000 paint / 3500 flare, smooth)
export type PerfTier = "mobile" | "tablet" | "low" | "high";

function detectLowSpecGPU(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return true;
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    if (!extension) return false;
    const renderer = (gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();
    
    return (
      renderer.includes("intel") ||
      renderer.includes("uhd") ||
      renderer.includes("hd graphics") ||
      renderer.includes("iris") ||
      renderer.includes("swiftshader") ||
      renderer.includes("software") ||
      renderer.includes("basic render") ||
      renderer.includes("geforce mx") ||
      (renderer.includes("radeon") && (renderer.includes("tm") || renderer.includes("graphics") || renderer.includes("vega")))
    );
  } catch {
    return false;
  }
}

export function detectPerfTier(): PerfTier {
  if (typeof navigator === "undefined") return "high";
  const ua = navigator.userAgent;

  // iPad in Safari 13+ reports "Macintosh" UA when "Request Desktop Site" is on.
  // Detect via touch support on a Mac UA.
  const isIpad =
    /iPad/i.test(ua) ||
    (/Macintosh/i.test(ua) && "ontouchend" in document);

  // Android tablets don't include "Mobile" in their UA string
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);

  if (isIpad || isAndroidTablet) return "tablet";

  const isPhone =
    /iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (/Android/i.test(ua) && /Mobile/i.test(ua));
  if (isPhone) return "mobile";

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 4 || detectLowSpecGPU()) return "low";
  return "high";
}

export const PERF_TIER = detectPerfTier();
export const PAINT_COUNT =
  PERF_TIER === "mobile"
    ? 7000
    : PERF_TIER === "tablet"
      ? 8000
      : PERF_TIER === "low"
        ? 6500
        : 10000;
export const FLARE_COUNT = 3500;
export const MAX_DPR = 1;
