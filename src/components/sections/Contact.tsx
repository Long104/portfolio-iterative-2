// ── Contact section ──

import { useEffect, memo } from "react";
import { gsap, PREFERS_REDUCED_MOTION } from "../../lib/gsap";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { playHoverSound } from "../../lib/audio-ui";
import { GlassPanel } from "../Glass";

export const ContactSection = memo(function ContactSection() {
  const headlineRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.15,
    y: "120%",
    clipWipe: true,
    start: "top 80%",
    end: "top 40%",
    duration: 1.0,
    ease: "expo.out",
  });

  const linksRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.1,
    y: "80%",
    start: "top 65%",
    end: "top 30%",
    duration: 0.7,
    ease: "expo.out",
  });

  const footerRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.08,
    y: "80%",
    start: "top 50%",
    end: "top 20%",
    duration: 0.6,
    ease: "power2.out",
  });

  useEffect(() => {
    if (PREFERS_REDUCED_MOTION) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const links = linksRef.current?.querySelectorAll<HTMLAnchorElement>(".contact__email, .contact__link");
    if (!links) return;

    const cleanups: (() => void)[] = [];

    links.forEach((link) => {
      function onEnter() {
        playHoverSound();
      }
      function onMove(e: MouseEvent) {
        const rect = link.getBoundingClientRect();
        gsap.to(link, {
          x: (e.clientX - (rect.left + rect.width / 2)) * 0.25,
          y: (e.clientY - (rect.top + rect.height / 2)) * 0.25,
          duration: 0.4,
          ease: "power3.out",
        });
      }
      function onLeave() {
        gsap.to(link, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
      }
      link.addEventListener("mouseenter", onEnter);
      link.addEventListener("mousemove", onMove);
      link.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        link.removeEventListener("mouseenter", onEnter);
        link.removeEventListener("mousemove", onMove);
        link.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <section className="section section--centered" data-section-index={6}>
      <div ref={headlineRef} className="contact__headline">
        open <br />
        <span>channel.</span>
      </div>
      <GlassPanel>
        <div ref={linksRef} className="contact">
          <a className="contact__email" href="mailto:longpantorn@gmail.com">
            longpantorn@gmail.com
          </a>
          <div className="contact__socials">
            <a className="contact__link" href="https://github.com/Long104" target="_blank" rel="noreferrer">
              github →
            </a>
            <a className="contact__link" href="https://www.linkedin.com/in/pantorn-chuavallee-99a51a341/" target="_blank" rel="noreferrer">
              linkedin →
            </a>
            <a className="contact__link" href="https://resume.pantorn.me/resume.pdf" target="_blank" rel="noreferrer">
              resume →
            </a>
          </div>
        </div>
      </GlassPanel>
      <div ref={footerRef} className="contact__footer">© 2026 pantorn chuavallee</div>
    </section>
  );
});
