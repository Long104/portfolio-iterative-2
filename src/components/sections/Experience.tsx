// ── Experience section ──
// Vertical wire with glowing dot nodes. Each text element gets its own
// SplitText-driven scroll reveal via useGSAP.

import { useRef, memo, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, ScrollTrigger, PREFERS_REDUCED_MOTION } from "../../lib/gsap";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { GlassPanel } from "../Glass";
import { EXPERIENCE, CURRENT_STATUS } from "../experience";

interface ExpItemData {
  period: string;
  role: string;
  company?: string;
  location?: string;
  description?: ReactNode;
  isCurrent?: boolean;
  isEducation?: boolean;
}

function ExpItem({ period, role, company, location, description, isCurrent, isEducation }: ExpItemData) {
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = contentRef.current;
    if (!el) return;

    if (PREFERS_REDUCED_MOTION) {
      gsap.set(el.children, { opacity: 0 });
      ScrollTrigger.create({
        trigger: el,
        start: "top 92%",
        end: "top 72%",
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(el.children, { opacity: self.progress });
        },
      });
      return;
    }

    const split = new SplitText(el, {
      type: "lines",
      linesClass: "split-line",
    });

    if (split.lines.length === 0) return;

    gsap.set(split.lines, { y: "120%", opacity: 0, willChange: "transform, opacity" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "top 92%",
        end: "top 72%",
        scrub: 1,
      },
      defaults: { ease: "expo.out", duration: 0.7 },
    });

    tl.to(split.lines, {
      y: "0%",
      opacity: 1,
      stagger: 0.08,
    });

    return () => {
      split.revert();
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, { scope: contentRef, revertOnUpdate: true });

  return (
    <div className={`tl-item${isCurrent ? " tl-item--current" : ""}${isEducation ? " tl-item--edu" : ""}`}>
      <div className={`tl-item__dot${isCurrent ? " tl-item__dot--current" : ""}`} />
      <div className="tl-item__content" ref={contentRef}>
        <div className={`tl-item__period${isCurrent ? " tl-item__period--current" : ""}`}>
          {period}
        </div>
        <div className={`tl-item__role${isCurrent ? " tl-item__role--current" : ""} keyword`}>
          {role}
        </div>
        {company && (
          <div className="tl-item__company">
            {company}{location && <span className="tl-item__location"> · {location}</span>}
          </div>
        )}
        {description && (
          <div className="tl-item__desc">{description}</div>
        )}
      </div>
    </div>
  );
}

export const ExperienceSection = memo(function ExperienceSection() {
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

  return (
    <section className="section" data-section-index={2}>
      <div ref={labelRef} className="section-label">experience</div>
      <GlassPanel>
        <div className="timeline">
          <ExpItem
            period="now"
            role={CURRENT_STATUS}
            isCurrent
          />
          {EXPERIENCE.map((job, i) => (
            <ExpItem
              key={i}
              period={job.period}
              role={job.role}
              company={job.company}
              location={job.location}
              description={job.description}
              isEducation={job.isEducation}
            />
          ))}
        </div>
      </GlassPanel>
    </section>
  );
});
