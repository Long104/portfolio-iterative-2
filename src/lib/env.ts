// ── Env utility constants ──

export const IS_CHROME =
  typeof navigator !== "undefined" &&
  /Chrome|Chromium|Edg|OPR\//i.test(navigator.userAgent);
