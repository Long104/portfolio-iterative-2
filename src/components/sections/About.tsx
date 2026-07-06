// ── About section ──

import { memo } from "react";
import { GlassPanel } from "../Glass";
import { useScrollReveal } from "../../hooks/useScrollReveal";

export const AboutSection = memo(function AboutSection() {
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

  const textRef = useScrollReveal<HTMLParagraphElement>({
    split: "lines",
    stagger: 0.12,
    y: "120%",
    start: "top 75%",
    end: "top 35%",
    duration: 0.9,
    ease: "expo.out",
  });

  return (
    <section className="section" data-section-index={1}>
      <div ref={labelRef} className="section-label">about</div>
      <GlassPanel>
        <div className="about__header">
          <img src="/webp/profile-small.webp" alt="pantorn chuavallee" className="about__photo" width="80" height="80" />
          <p ref={textRef} className="about__text">
            it graduate & software engineer from bangkok. <br />
            shipped production code at omise (opn) during a 6-month internship. <br />
            <span>
              across go, typescript, and aws — into webgl, ai, and backend
              systems.
            </span>
          </p>
        </div>
      </GlassPanel>
    </section>
  );
});
