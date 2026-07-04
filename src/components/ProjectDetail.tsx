// ── Project detail overlay ──
// Full-screen case study overlay triggered by clicking a project card.
// The panel is a large refractive glass element — the 3D vortex is visible
// through it. No dark backdrop; the glass IS the backdrop.
// GSAP animation: glass entrance → content stagger on open; fast reverse on close.
// Close on: Escape key, click outside, close button.
// Lenis scroll lock when open.

import { useEffect, useRef, useCallback, useMemo } from "react";
import { gsap, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import type { Project } from "./projects";
import { playCloseSound } from "../lib/audio-ui";
import { RefractiveDiv, buildDetailConfig } from "./glass-configs";
import { useDeviceOrientation } from "../useDeviceOrientation";

interface ProjectDetailProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const wasBodyOverflow = useRef<string>("");
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // ── Refractive glass config ──
  const specularAngle = useDeviceOrientation();
  const detailConfig = useMemo(() => buildDetailConfig(specularAngle), [specularAngle]);

  // ── Open: staggered entrance ──
  // Sequence: glass panel → image → header → desc → techs → highlights → links
  useEffect(() => {
    if (!project) return;

    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    // Cockpit display ON
    gsap.set(overlay, { display: "flex" });

    if (PREFERS_REDUCED_MOTION) {
      gsap.set(overlay, { opacity: 1 });
      return;
    }

    // Scope: panel for class-based queries
    const q = gsap.utils.selector(panel);

    // Gather animated sections
    const imageWrap = q(".project-detail__image-wrap");
    const header = q(".project-detail__header");
    const desc = q(".project-detail__desc");
    const techTags = q(".project-detail__tech");
    const highlights = q(".project-detail__highlight");
    const links = q(".project-detail__links");

    // Zero entry positions
    gsap.set(imageWrap, { x: -36, opacity: 0 });
    gsap.set([header, desc], { y: 18, opacity: 0 });
    gsap.set(techTags, { y: 12, opacity: 0 });
    gsap.set(highlights, { y: 12, opacity: 0 });
    gsap.set(links, { y: 10, opacity: 0 });

    const tl = gsap.timeline();
    tlRef.current = tl;

    // 1. Glass panel scales up + fades in
    tl.fromTo(
      panel,
      { opacity: 0, scale: 0.92, y: 24 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: "power3.out" },
    );

    // 2. Image slides in from left
    tl.to(imageWrap, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, "-=0.25");

    // 3. Header fades up
    tl.to(header, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, "-=0.25");

    // 4. Description fades up
    tl.to(desc, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }, "-=0.2");

    // 5. Tech tags stagger in with a bounce
    tl.to(techTags, { y: 0, opacity: 1, stagger: 0.04, duration: 0.3, ease: "back.out(1.3)" }, "-=0.15");

    // 6. Highlights stagger in
    tl.to(highlights, { y: 0, opacity: 1, stagger: 0.05, duration: 0.3, ease: "power2.out" }, "-=0.1");

    // 7. Links fade up
    tl.to(links, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }, "-=0.08");

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, [project]);

  // ── Close: fast reverse ──
  const animateClose = useCallback(() => {
    playCloseSound();
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    if (!overlay || !panel) return;

    if (PREFERS_REDUCED_MOTION) {
      gsap.set(overlay, { display: "none", opacity: 0 });
      onClose();
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    const q = gsap.utils.selector(panel);
    const imageWrap = q(".project-detail__image-wrap");
    const header = q(".project-detail__header");
    const desc = q(".project-detail__desc");
    const techs = q(".project-detail__techs");
    const highlights = q(".project-detail__highlights");
    const links = q(".project-detail__links");

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay, { display: "none" });
        onClose();
      },
    });
    tlRef.current = tl;

    // Fast exit: content out first
    tl.to(links, { y: 8, opacity: 0, duration: 0.15, ease: "power2.in" }, 0);
    tl.to(highlights, { y: 8, opacity: 0, duration: 0.12, ease: "power2.in" }, 0);
    tl.to(techs, { y: 8, opacity: 0, duration: 0.1, ease: "power2.in" }, 0);
    tl.to([header, desc, imageWrap], { y: 10, opacity: 0, duration: 0.12, ease: "power2.in" }, 0);

    // Glass panel scales down + fades out
    tl.to(panel, { opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in" }, "-=0.05");
  }, [onClose]);

  // ── Lock body scroll when open ──
  useEffect(() => {
    if (!project) return;

    wasBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = wasBodyOverflow.current;
    };
  }, [project]);

  // ── Escape to close ──
  useEffect(() => {
    if (!project) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") animateClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project, animateClose]);

  // ── Focus trap + restore ──
  useEffect(() => {
    if (!project) return;

    const panel = panelRef.current;
    if (!panel) return;
    const panelEl: HTMLDivElement = panel;

    // Stow focus for restore on close
    prevFocusRef.current = document.activeElement as HTMLElement;

    // Focus close button after panel animates in
    const focusTimer = setTimeout(() => {
      const closeBtn = panel.querySelector<HTMLButtonElement>(".project-detail__close");
      closeBtn?.focus();
    }, 500);

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      const focusables = Array.from(
        panelEl.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onTab);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onTab);
      // Restore focus to the element that opened the overlay
      prevFocusRef.current?.focus();
    };
  }, [project]);

  // ── Click outside to close ──
  function onOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      animateClose();
    }
  }

  // ── No project = hidden ──
  if (!project) return null;

  return (
    <div
      ref={overlayRef}
      className="project-detail"
      style={{ display: "none" }}
      onClick={onOverlayClick}
    >
      {/* ── Liquid glass panel ── */}
      <RefractiveDiv
        ref={panelRef}
        refraction={detailConfig}
        className="project-detail__panel"
      >
        {/* Close button */}
        <button
          className="project-detail__close"
          onClick={animateClose}
          aria-label="Close project detail"
        >
          <span className="project-detail__close-icon">✕</span>
          <span className="project-detail__close-label">close</span>
        </button>

        {/* ── Image ── */}
        <div className="project-detail__image-wrap">
          <img
            src={project.image}
            alt={project.title}
            className="project-detail__image"
          />
        </div>

        {/* ── Info ── */}
        <div className="project-detail__info">
          {/* Header */}
          <div className="project-detail__header">
            <span className="project-detail__num">{project.num}</span>
            <h2 className="project-detail__title">{project.title}</h2>
          </div>

          {/* Short description */}
          <p className="project-detail__desc">{project.longDescription}</p>

          {/* Tech stack */}
          <div className="project-detail__techs">
            <span className="project-detail__techs-label">// stack</span>
            <div className="project-detail__techs-list">
              {project.techs.map((tech) => (
                <span key={tech} className="project-detail__tech">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="project-detail__highlights">
            <span className="project-detail__highlights-label">// highlights</span>
            <ul className="project-detail__highlights-list">
              {project.highlights.map((h, i) => (
                <li key={i} className="project-detail__highlight">
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div className="project-detail__links">
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="project-detail__link project-detail__link--primary"
            >
              <span className="project-detail__link-bracket">[</span>
              github
              <span className="project-detail__link-bracket">]</span>
            </a>
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              className="project-detail__link project-detail__link--secondary"
            >
              <span className="project-detail__link-bracket">[</span>
              live site
              <span className="project-detail__link-bracket">]</span>
            </a>
          </div>
        </div>
      </RefractiveDiv>
    </div>
  );
}
