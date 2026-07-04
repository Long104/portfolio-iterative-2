// ── Stack Section ──
// Glass pill row layout — each tech name is its own small refractive element.
// Liquid glass specular highlight moves independently across pills on mouse move.
// Normal developer text. No Gundam labels, no scanlines, no gimmicks.
// The glass effect IS the visual — that's the artistic statement.
// Two clean flex rows (or wraps to fit). Staggered reveal on scroll enter.

import { memo, useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useDeviceOrientation } from "../useDeviceOrientation";
import { RefractiveDiv, buildSmallConfig } from "./glass-configs";

const TECH_ITEMS = [
  // Languages
  "go", "typescript", "javascript", "python", "sql", "java",
  // Frontend
  "next.js", "react", "tailwind",
  // Backend
  "fiber", "gin", "express", "hono", "rest", "websocket",
  // Databases
  "postgres", "mysql", "mongodb",
  // Cloud & DevOps
  "aws", "ecs", "s3", "cloudfront", "opensearch", "bedrock", "docker", "kubernetes", "terraform", "vercel", "github actions", "buildkite",
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

  // GSAP stagger reveal for the glass pills
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

    tl.to(".stack-pill", {
      opacity: 1,
      y: 0,
      stagger: 0.03,
      duration: 0.35,
    });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="section" data-section-index={4}>
      <div ref={labelRef} className="section-label">stack</div>

      <div className="stack-pills">
        {TECH_ITEMS.map((item) => (
          <RefractiveDiv
            key={item}
            refraction={refraction}
            className="stack-pill"
          >
            {item}
          </RefractiveDiv>
        ))}
      </div>
    </section>
  );
});
