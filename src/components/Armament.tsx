// ── Stack Section ──
// 8 core technologies as refractive liquid glass pills.

import { memo, useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useDeviceOrientation } from "../useDeviceOrientation";
import { RefractiveDiv, buildSmallConfig } from "./glass-configs";

const STACK = [
  "go", "typescript", "react", "next.js",
  "aws", "docker", "postgres", "three.js",
] as const;

export const StackSection = memo(function StackSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const specularAngle = useDeviceOrientation();
  const refraction = useMemo(() => buildSmallConfig(specularAngle), [specularAngle]);

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
      stagger: 0.06,
      duration: 0.4,
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
        {STACK.map((item) => (
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
