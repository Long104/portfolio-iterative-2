import { refractive } from "refractive";
import type { ReactNode } from "react";
import { PROJECTS } from "./projects";

// ── Refractive wrappers ──
// Chrome: native SVG displacement refraction (true light-bending glass)
// Firefox/Safari: snapshot fallback (captures backdrop, applies same filter)
// Mobile/perf-conscious: can pass fallbackMode: "simple" for blur-only

export const RefractiveDiv = refractive.div;

// Shared refraction config — experiment: clear glass, no blur
export const refractionConfig = {
  radius: 16,
  blur: 0,
  bezelWidth: 12,
  specularOpacity: 0.2,
} as const;

// ── Glass Panel (for About section) ──
export function GlassPanel({ children }: { children: ReactNode }) {
  return (
    <RefractiveDiv refraction={refractionConfig} className="glass-panel">
      {children}
    </RefractiveDiv>
  );
}

// ── Project Card (for Work section) ──
export function ProjectCard({
  project,
}: {
  project: (typeof PROJECTS)[number];
}) {
  return (
    <RefractiveDiv
      refraction={{
        radius: 14,
        blur: 0,
        bezelWidth: 10,
        specularOpacity: 0.15,
      }}
      className="project-card"
    >
      <div className="project-card__num">{project.num}</div>
      <div className="project-card__title">{project.title}</div>
      <div className="project-card__stack">{project.stack}</div>
      <div className="project-card__arrow">{"→"}</div>
    </RefractiveDiv>
  );
}
