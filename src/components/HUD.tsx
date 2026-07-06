// ── HUD — Cockpit status overlay ──
// Top-left: pilot ident. Top-right: circular audio scanner.

import { CircularVisualizer } from "./CircularVisualizer";
import { usePerfState } from "../perfStore";

export function HUD() {
  const { override, tier, setOverride } = usePerfState();
  console.log("HUD render:", { override, tier });

  return (
    <>
      {/* Top-left: pilot ident */}
      <div className="hud hud--tl">
        <div className="hud__name">pantorn chuavallee</div>
        <div className="hud__role">pilot</div>
        
        {/* Quality control */}
        <div className="hud__quality" style={{ marginTop: "12px", pointerEvents: "auto", fontSize: "11px", color: "rgba(255, 255, 255, 0.5)" }}>
          <span style={{ marginRight: "6px", opacity: 0.6 }}>sys_qual:</span>
          {(["low", "high", "auto"] as const).map((opt, i) => {
            const isActive = override === opt;
            const label = opt === "auto" ? `auto (${tier})` : opt;
            return (
              <span key={opt}>
                {i > 0 && <span style={{ margin: "0 4px", opacity: 0.3 }}>/</span>}
                <button
                  onClick={() => setOverride(opt)}
                  className={`hud__quality-btn ${isActive ? "hud__quality-btn--active" : ""}`}
                >
                  {label}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* Top-right: circular audio scanner */}
      <div className="hud hud--tr">
        <CircularVisualizer />
      </div>
    </>
  );
}
