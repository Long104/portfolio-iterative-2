// ── HUD — Cockpit status overlay ──
// Top-left: pilot ident. Top-right: circular audio scanner.

import { CircularVisualizer } from "./CircularVisualizer";
import { usePerfState } from "../perfStore";

export function HUD() {
  const { override, tier, setOverride } = usePerfState();

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
                  style={{
                    background: "none",
                    border: "none",
                    padding: "0 2px",
                    color: isActive ? "var(--theme-accent2)" : "rgba(255, 255, 255, 0.4)",
                    textDecoration: isActive ? "underline" : "none",
                    fontWeight: isActive ? "600" : "normal",
                    cursor: "pointer",
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    textTransform: "lowercase",
                    outline: "none",
                    transition: "color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)";
                  }}
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
