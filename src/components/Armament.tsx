// ── Stack Section ──
// Hybrid glass pill layout:
//   • 8 core technologies get full refractive liquid glass (premium feel)
//   • Remaining technologies use CSS backdrop-filter glass (lightweight)
// Both look like glass pills from a distance. Only the top row has the
// liquid specular shimmer on mouse move.
// Performance: 8 refractive snapshots instead of 35+ — smooth on any device.

import { memo, useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useDeviceOrientation } from "../useDeviceOrientation";
import { RefractiveDiv, buildSmallConfig } from "./glass-configs";

// Core identity tech — gets the premium refractive liquid glass treatment
const REFRACTIVE_TECH = [
  "go", "typescript", "react", "next.js",
  "aws", "docker", "postgres", "kubernetes",
] as const;

// Everything else — CSS backdrop-filter glass pills (no canvas cost)
const CSS_TECH = [
  // Languages
  "javascript", "python", "sql", "java",
  // Frontend
  "tailwind",
  // Backend
  "fiber", "gin", "express", "hono", "rest", "websocket",
  // Databases
  "mysql", "mongodb",
  // Cloud & DevOps
  "ecs", "s3", "cloudfront", "opensearch", "bedrock", "terraform", "vercel", "github actions", "buildkite",
  // Testing & Tools
  "jest", "vitest", "playwright", "git", "gorm", "prisma", "mixpanel", "launchdarkly", "sonarqube",
] as const;

export const StackSection = memo(function StackSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const specularAngle = useDeviceOrientation();
  const refraction = useMemo(() => buildSmallConfig(specularAngle), [specularAngle]);

  // Section label: same split-chars scroll reveal as other sections
  const labelRef = useScrollReveal<HTMLDivElement>({
    split: "chars",
    stagger: 0.02,
    x: "-60%",
    y: "0%",
    start: "top 90%",
    end: "top 65%",
    duration: 0.4,
    ease: "power2.out",
  });

  // GSAP stagger reveal — both refractive and CSS pills animate together
  useGSAP(() => {
    if (PREFERS_REDUCED_MOTION) {
      gsap.set(".stack-pill", { opacity: 1, y: 0 });
      return;
    }

    gsap.set(".stack-pill", { opacity: 0, y: 16 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
      defaults: { ease: "power2.out" },
    });

    // Refractive pills first (slightly slower stagger — they're the heroes)
    tl.to(".stack-pill--refractive", {
      opacity: 1,
      y: 0,
      stagger: 0.05,
      duration: 0.4,
    });

    // CSS pills follow immediately (faster stagger — supporting cast)
    tl.to(".stack-pill--css", {
      opacity: 1,
      y: 0,
      stagger: 0.02,
      duration: 0.3,
    }, "-=0.2");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="section" data-section-index={4}>
      <div ref={labelRef} className="section-label">stack</div>

      <div className="stack-pills">
        {/* Premium refractive glass pills */}
        {REFRACTIVE_TECH.map((item) => (
          <RefractiveDiv
            key={item}
            refraction={refraction}
            className="stack-pill stack-pill--refractive"
          >
            {item}
          </RefractiveDiv>
        ))}

        {/* Lightweight CSS glass pills */}
        {CSS_TECH.map((item) => (
          <div key={item} className="stack-pill stack-pill--css">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
});
