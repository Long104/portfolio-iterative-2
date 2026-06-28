import { type RefObject } from "react";
import HeroSection from "./HeroSection";
import ProjectsSection from "./ProjectsSection";
import ContactSection from "./ContactSection";

interface PortfolioContentProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

export default function PortfolioContent({ scrollRef, onScroll }: PortfolioContentProps) {
  return (
    <div ref={scrollRef} className="scroll-container" onScroll={onScroll}>
      <HeroSection />
      <ProjectsSection />
      <ContactSection />
    </div>
  );
}
