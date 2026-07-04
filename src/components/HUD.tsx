// ── HUD — Cockpit status overlay ──
// Top-left: pilot ident. Top-right: audio waveform monitor.

import { PsycommuWaveform } from "./PsycommuWaveform";

interface HUDProps {
  sectionIndex: number;
  totalSections: number;
  audioStatus: string;
  trackName: string;
  isPlaying: boolean;
}

export function HUD({ trackName }: HUDProps) {
  return (
    <>
      {/* Top-left: pilot ident */}
      <div className="hud hud--tl">
        <div className="hud__name">pantorn chuavallee</div>
        <div className="hud__role">pilot</div>
      </div>

      {/* Top-right: audio waveform */}
      <div className="hud hud--tr">
        <PsycommuWaveform />
        <div className="hud__track">{trackName}</div>
      </div>
    </>
  );
}
