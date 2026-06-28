import { useEffect, useRef } from "react";
import Lenis from "lenis";
import HeroSection from "./HeroSection";
import ProjectsSection from "./ProjectsSection";
import ContactSection from "./ContactSection";

interface PortfolioContentProps {
  onScrollProgress: (progress: number) => void;
}

export default function PortfolioContent({ onScrollProgress }: PortfolioContentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.08,
      wheelMultiplier: 1,
      // Tweak these to taste:
      //   lerp lower = smoother but more lag
      //   wheelMultiplier higher = faster scroll
    });

    lenis.on("scroll", (l) => {
      onScrollProgress(l.progress);
    });

    return () => {
      lenis.destroy();
    };
  }, [onScrollProgress]);

  return (
    <div ref={wrapperRef} className="scroll-container">
      <div ref={contentRef} className="scroll-content">
        <HeroSection />
        <ProjectsSection />
        <ContactSection />
      </div>
    </div>
  );
}
