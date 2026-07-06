// ── Work section — horizontal scroll ──
// Pins on scroll, cards scroll horizontally. Each card has clip-path reveal.

import { useRef, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "../../lib/gsap";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useHorizontalScroll } from "../../hooks/useHorizontalScroll";
import { ProjectCard } from "../Glass";
import { PROJECTS, type Project } from "../projects";

export function WorkSection({ started, onOpenProject, hidden }: { started: boolean; onOpenProject?: (project: Project) => void; hidden?: boolean }) {
  const containerRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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

  const horizontalTween = useRef<gsap.core.Tween>(null);
  useHorizontalScroll(containerRef, trackRef, started, horizontalTween);

  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const revealTriggers = useRef<ScrollTrigger[]>([]);

  // ── Track viewport breakpoint for clip reveal strategy ──
  // Re-runs the clip effect when the viewport crosses 768px (e.g. iPad rotation)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(max-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsDesktop(!mq.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!started) return;

    revealTriggers.current.forEach((st) => st.kill());
    revealTriggers.current = [];

    imageRefs.current.forEach((img) => {
      if (img) gsap.set(img, { clipPath: "inset(0 100% 0 0)" });
    });

    if (isDesktop) {
      const containerEl = containerRef.current;
      if (!containerEl) return;

      const maxProgress = new Map<Element, number>();

      const updateClipPaths = () => {
        const viewportWidth = containerEl.clientWidth;

        imageRefs.current.forEach((imgEl) => {
          if (!imgEl) return;
          const card = imgEl.closest(".project-card") as HTMLElement;
          if (!card) return;

          const cardRect = card.getBoundingClientRect();
          const cardViewportLeft = cardRect.left;

          const enterStart = viewportWidth;
          const enterEnd = viewportWidth * 0.6;
          const rawProgress = (enterStart - cardViewportLeft) / (enterStart - enterEnd);

          const clamped = gsap.utils.clamp(0, 1, rawProgress);
          const prev = maxProgress.get(card) ?? 0;
          const progress = clamped > prev ? clamped : prev;
          maxProgress.set(card, progress);

          imgEl.style.clipPath = `inset(0 ${100 - progress * 100}% 0 0)`;
        });
      };

      updateClipPaths();
      gsap.ticker.add(updateClipPaths);

      return () => {
        gsap.ticker.remove(updateClipPaths);
        revealTriggers.current.forEach((st) => st.kill());
        revealTriggers.current = [];
      };
    }

    imageRefs.current.forEach((imgEl) => {
      if (!imgEl) return;
      const card = imgEl.closest(".project-card") as HTMLElement;
      if (!card) return;

      const st = ScrollTrigger.create({
        trigger: card,
        start: "top 85%",
        end: "top 55%",
        scrub: 0.6,
        onUpdate: (self) => {
          imgEl.style.clipPath = `inset(0 ${100 - self.progress * 100}% 0 0)`;
        },
      });

      revealTriggers.current.push(st);
    });

    return () => {
      revealTriggers.current.forEach((st) => st.kill());
      revealTriggers.current = [];
    };
  }, [started, isDesktop]);

  return (
    <section ref={containerRef} className="section section--work-horizontal" data-section-index={3} style={{ visibility: hidden ? "hidden" : "visible" }}>
      <div ref={labelRef} className="section-label work-label">selected work</div>
      <div ref={trackRef} className="work-track">
        {PROJECTS.map((project, i) => (
          <ProjectCard
            key={project.num}
            project={project}
            onOpen={onOpenProject}
            imageRef={(el: HTMLDivElement | null) => { imageRefs.current[i] = el; }}
          />
        ))}
        <div className="work-track__spacer" aria-hidden="true" />
      </div>
    </section>
  );
}
