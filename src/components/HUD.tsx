// ── HUD — Cockpit status overlay ──
// Top-left: pilot ident. Top-right: circular audio scanner.

import { CircularVisualizer } from "./CircularVisualizer";

export function HUD() {
  return (
    <>
      {/* Top-left: pilot ident */}
      <div className="hud hud--tl">
        <div className="hud__name">pantorn chuavallee</div>
        <div className="hud__role">pilot</div>
      </div>

      {/* Top-right: circular audio scanner */}
      <div className="hud hud--tr">
        <CircularVisualizer />
      </div>
    </>
  );
}
