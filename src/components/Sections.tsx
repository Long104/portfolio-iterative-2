// ── Portfolio Sections ──
// Hero, About, Experience, Work, Contact
// Each is a <section> with data-section-index for scroll tracking.
// All text uses useScrollReveal for SplitText-driven scroll animations.
// Pattern: play-once-on-enter (the SOTD portfolio standard).

import { GlassPanel, ProjectCard } from "./Glass";
import { PROJECTS } from "./projects";
import { EXPERIENCE, CURRENT_STATUS } from "./experience";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useHorizontalScroll } from "../hooks/useHorizontalScroll";
import { useRef, useEffect, useState, memo } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, ScrollTrigger, PREFERS_REDUCED_MOTION } from "../lib/gsap";
import { playHoverSound } from "../lib/audio-ui";
import { getMouseState } from "../mouseStore";

// ── Hero (section 0) — Cinematic name reveal ──
// Three-tier typography hierarchy:
//   1. PANTORN CHUAVALLEE — massive, SplitText line reveal (the hero moment)
//   2. software engineer — small mono subtitle
//   3. "building things that feel alive" — secondary display tagline
//
// Two-phase approach (no revert/re-run):
//   Phase 1 (useGSAP, runs once on mount): SplitText + hide lines
//   Phase 2 (useEffect[started]): play timeline when LAUNCH clicked
export function HeroSection({ started }: { started: boolean }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<{ lines: Element[] } | null>(null);

  // Phase 1: Split name into lines + hide everything (runs ONCE)
  useGSAP(
    () => {
      const el = nameRef.current;
      if (!el) return;

      if (PREFERS_REDUCED_MOTION) {
        gsap.set([el, roleRef.current, taglineRef.current], { opacity: 0 });
        return;
      }

      const split = new SplitText(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        wordsClass: "split-word",
        charsClass: "split-char",
      });

      if (split.lines.length === 0) return;

      // Hide name lines + role + tagline
      gsap.set(split.lines, { yPercent: 140, opacity: 0 });
      gsap.set([roleRef.current, taglineRef.current], { opacity: 0, y: 20 });
      splitRef.current = split;

      return () => {
        split.revert();
        splitRef.current = null;
      };
    },
    { scope: nameRef },
  );

  // Phase 2: Play reveal when LAUNCH clicked
  useEffect(() => {
    if (!started) return;

    const el = nameRef.current;
    if (!el) return;

    if (PREFERS_REDUCED_MOTION) {
      gsap.to([el, roleRef.current, taglineRef.current], {
        opacity: 1, duration: 0.5, delay: 0.3, stagger: 0.15, ease: "power2.out",
      });
      return;
    }

    const split = splitRef.current;
    if (!split || split.lines.length === 0) return;

    const tl = gsap.timeline({ delay: 0.35 });

    // 1. Name lines — dramatic stagger reveal
    tl.to(split.lines, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.14,
      duration: 1.0,
      ease: "expo.out",
    });

    // 2. Role subtitle fades up
    tl.to(roleRef.current, {
      opacity: 1, y: 0, duration: 0.5, ease: "power2.out",
    }, "-=0.4");

    // 3. Tagline fades up
    tl.to(taglineRef.current, {
      opacity: 1, y: 0, duration: 0.5, ease: "power2.out",
    }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, [started]);

  // Phase 3: Mouse-following 3D tilt on the name (after reveal completes)
  useEffect(() => {
    if (!started || PREFERS_REDUCED_MOTION) return;
    const el = nameRef.current;
    if (!el) return;

    const setRotateY = gsap.quickTo(el, "rotateY", { duration: 0.8, ease: "power2.out" });
    const setRotateX = gsap.quickTo(el, "rotateX", { duration: 0.8, ease: "power2.out" });

    function onTick() {
      const { x, y } = getMouseState();
      setRotateY(x * 4);   // ±4deg horizontal
      setRotateX(-y * 3);  // ±3deg vertical (inverted)
    }

    // Start with no tilt, activate after reveal animation finishes (~1.5s)
    const startTimer = setTimeout(() => {
      gsap.ticker.add(onTick);
    }, 1800);

    return () => {
      clearTimeout(startTimer);
      gsap.ticker.remove(onTick);
    };
  }, [started]);

  return (
    <section className="section hero" data-section-index={0}>
      <div className="hero__inner">
        <h1 ref={nameRef} className="hero__name">
          pantorn <br />
          <span>chuavallee</span>
        </h1>
        <div ref={roleRef} className="hero__role">software engineer</div>
        <div ref={taglineRef} className="hero__tagline">
          building things that feel alive.
        </div>
      </div>
      <div className="hero__scroll-hint">↓ scroll</div>
    </section>
  );
}

// ── About (section 1) ──
const STACK = {
  languages: ["go", "typescript", "python", "sql"],
  frameworks: ["next.js", "react", "tailwind", "three.js", "go (fiber)", "grpc"],
  cloud: ["aws", "docker", "kubernetes", "terraform", "postgres"],
};

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

  const langRef = useScrollReveal<HTMLDivElement>({
    split: "words",
    stagger: 0.03,
    x: "-40%",
    y: "0%",
    start: "top 60%",
    end: "top 25%",
    duration: 0.5,
    ease: "power2.out",
  });

  const frameRef = useScrollReveal<HTMLDivElement>({
    split: "words",
    stagger: 0.03,
    x: "-40%",
    y: "0%",
    start: "top 50%",
    end: "top 20%",
    duration: 0.5,
    ease: "power2.out",
  });

  const toolsRef = useScrollReveal<HTMLDivElement>({
    split: "words",
    stagger: 0.03,
    x: "-40%",
    y: "0%",
    start: "top 40%",
    end: "top 15%",
    duration: 0.5,
    ease: "power2.out",
  });

  return (
    <section className="section" data-section-index={1}>
      <div ref={labelRef} className="section-label">// about</div>
      <GlassPanel>
        <div className="about__header">
          <img src="/profile-small.jpg" alt="pantorn chuavallee" className="about__photo" />
          <p ref={textRef} className="about__text">
            it graduate & software engineer from bangkok. <br />
            shipped production code at omise (opn) during a 6-month internship. <br />
            <span>
              building across go, typescript, and aws. into immersive webgl,
              ai integration, and systems that feel alive.
            </span>
          </p>
        </div>

        <div className="stack-grid">
          {Object.entries(STACK).map(([category, items], idx) => {
            const ref = idx === 0 ? langRef : idx === 1 ? frameRef : toolsRef;
            return (
              <div key={category} className="stack-col">
                <div ref={ref} className="stack-col__label">// {category}</div>
                <ul className="stack-col__list">
                  {items.map((item) => (
                    <li key={item} className="stack-col__item">{item}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </section>
  );
});

// ── Experience Item (Timeline) ──
// Vertical wire with glowing dot nodes. No glass panel — just the wire.
// Each text element gets its own useScrollReveal ref for staggered entry.

interface ExpItemData {
  period: string;
  role: string;
  company?: string;
  location?: string;
  description?: string;
  isCurrent?: boolean;
  isEducation?: boolean;
}

function ExpItem({ period, role, company, location, description, isCurrent, isEducation }: ExpItemData) {
  const periodRef = useScrollReveal<HTMLDivElement>({
    split: "chars",
    stagger: 0.02,
    x: "-50%",
    y: "0%",
    start: "top 92%",
    end: "top 78%",
    duration: 0.35,
    ease: "power2.out",
  });
  const roleRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.1,
    y: "120%",
    start: "top 89%",
    end: "top 74%",
    duration: 0.7,
    ease: "expo.out",
  });
  const companyRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.08,
    y: "100%",
    start: "top 85%",
    end: "top 70%",
    duration: 0.5,
    ease: "power2.out",
  });
  const descRef = useScrollReveal<HTMLDivElement>({
    split: "lines",
    stagger: 0.06,
    y: "100%",
    start: "top 82%",
    end: "top 66%",
    duration: 0.5,
    ease: "power2.out",
  });

  return (
    <div className={`tl-item${isCurrent ? " tl-item--current" : ""}${isEducation ? " tl-item--edu" : ""}`}>
      {/* Glowing dot */}
      <div className={`tl-item__dot${isCurrent ? " tl-item__dot--current" : ""}`} />

      <div className="tl-item__content">
        <div
          ref={periodRef}
          className={`tl-item__period${isCurrent ? " tl-item__period--current" : ""}`}
        >
          {period}
        </div>
        <div
          ref={roleRef}
          className={`tl-item__role${isCurrent ? " tl-item__role--current" : ""}`}
        >
          {role}
        </div>
        {company && (
          <div ref={companyRef} className="tl-item__company">
            {company}{location && <span className="tl-item__location"> · {location}</span>}
          </div>
        )}
        {description && (
          <div ref={descRef} className="tl-item__desc">{description}</div>
        )}
      </div>
    </div>
  );
}

// ── Experience (section 2) — Timeline ──
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
      <div ref={labelRef} className="section-label">// experience</div>
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

// ── Work (section 3) ──
// ── Work (section 3) — Pinned horizontal scroll ──
// When you scroll into this section, it pins and cards scroll
// horizontally. Each card has an image with clip-path reveal.
export function WorkSection({ started, onOpenProject }: { started: boolean; onOpenProject?: (project: (typeof PROJECTS)[number]) => void }) {
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

  // ── Pinned horizontal scroll hook ──
  const horizontalTween = useRef<gsap.core.Tween>(null);
  useHorizontalScroll(containerRef, trackRef, started, horizontalTween);

  // ── Per-card clip-path reveal ──
  // Desktop (≥769px): wipes as card scrolls horizontally via containerAnimation.
  // Mobile (≤768px): wipes as card scrolls vertically via standard ScrollTrigger.
  // Same visual (right→left clip-path wipe), different trigger mechanism.
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const revealTriggers = useRef<ScrollTrigger[]>([]);

  useEffect(() => {
    if (!started) return;

    // Kill any previous triggers
    revealTriggers.current.forEach((st) => st.kill());
    revealTriggers.current = [];

    // Set all images to hidden initially
    imageRefs.current.forEach((img) => {
      if (img) gsap.set(img, { clipPath: "inset(0 100% 0 0)" });
    });

    if (horizontalTween.current) {
      // ── Desktop: horizontal scroll wipe ──
      const containerAnim = horizontalTween.current;
      imageRefs.current.forEach((imgEl) => {
        if (!imgEl) return;
        const card = imgEl.closest(".project-card") as HTMLElement;
        if (!card) return;

        const st = ScrollTrigger.create({
          trigger: card,
          containerAnimation: containerAnim,
          start: "left right",
          end: "left 60%",
          scrub: 0.6,
          onUpdate: (self) => {
            imgEl.style.clipPath = `inset(0 ${100 - self.progress * 100}% 0 0)`;
          },
        });

        revealTriggers.current.push(st);
      });
    } else {
      // ── Mobile: vertical scroll wipe ──
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
    }

    return () => {
      revealTriggers.current.forEach((st) => st.kill());
      revealTriggers.current = [];
    };
  }, [started]);

  return (
    <section ref={containerRef} className="section section--work-horizontal" data-section-index={3}>
      <div ref={labelRef} className="section-label work-label">// selected work</div>
      <div ref={trackRef} className="work-track">
        {PROJECTS.map((project, i) => (
          <ProjectCard
            key={project.num}
            project={project}
            onOpen={onOpenProject}
            imageRef={(el: HTMLDivElement | null) => { imageRefs.current[i] = el; }}
          />
        ))}
        {/* Spacer — invisible element that creates right breathing room
            for the last card. When the spacer reaches the left edge,
            scroll stops and the last card is fully visible. */}
        <div className="work-track__spacer" aria-hidden="true" />
      </div>
    </section>
  );
}

// ── Currently (section 4) — Live Psycommu status readout ──
// Terminal typewriter effect: header types out, clock ticks live,
// each row's value types sequentially. Blinking cursor at the end.
// No glass panel — bare text on vortex, echoes the hero.
const CURRENTLY_ITEMS = [
  { key: "learning", value: "WebGPU, system design, distributed systems" },
  { key: "building", value: "this portfolio — 3D vortex with audio reactivity" },
  { key: "reading", value: "Designing Data-Intensive Applications" },
  { key: "playing", value: "chess (1200 elo), rubik's cube (sub-30s pb)" },
  { key: "watching", value: "gundam gquuuuuux" },
] as const;

// Helper: type text char-by-char into a GSAP timeline
function typeChars(
  tl: gsap.core.Timeline,
  el: HTMLElement,
  text: string,
  charSpeed: number,
) {
  const proxy = { n: 0 };
  tl.to(proxy, {
    n: text.length,
    duration: text.length * charSpeed,
    ease: "none",
    onUpdate: () => {
      el.textContent = text.slice(0, Math.round(proxy.n));
    },
  });
}

export const CurrentlySection = memo(function CurrentlySection() {
  const sectionRef = useRef<HTMLElement>(null);
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

  const headerTextRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const keyRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const arrowRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const typedRef = useRef(false);

  // ── Live Bangkok clock (UTC+7) ──
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    function tick() {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const bkk = new Date(utc + 7 * 3600000);
      const h = String(bkk.getHours()).padStart(2, "0");
      const m = String(bkk.getMinutes()).padStart(2, "0");
      const s = String(bkk.getSeconds()).padStart(2, "0");
      setClock(`${h}:${m}:${s}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Typewriter sequence on scroll enter ──
  useEffect(() => {
    if (typedRef.current) return;
    const section = sectionRef.current;
    if (!section) return;

    const st = ScrollTrigger.create({
      trigger: section,
      start: "top 75%",
      once: true,
      onEnter: () => {
        typedRef.current = true;

        // Reduced motion: show everything instantly
        if (PREFERS_REDUCED_MOTION) {
          if (headerTextRef.current) headerTextRef.current.textContent = "> LOCATION: bangkok —";
          CURRENTLY_ITEMS.forEach((item, i) => {
            const key = keyRefs.current[i];
            const arrow = arrowRefs.current[i];
            const val = valueRefs.current[i];
            if (key) key.style.opacity = "0.6";
            if (arrow) arrow.style.opacity = "0.4";
            if (val) val.textContent = item.value;
          });
          if (cursorRef.current) cursorRef.current.style.opacity = "0.7";
          return;
        }

        const tl = gsap.timeline({ delay: 0.3 });

        // 1. Type header text
        typeChars(tl, headerTextRef.current!, "> LOCATION: bangkok —", 0.018);

        // 2. Each row: fade in key + arrow, then type value
        CURRENTLY_ITEMS.forEach((item, i) => {
          const key = keyRefs.current[i];
          const arrow = arrowRefs.current[i];
          const val = valueRefs.current[i];
          const gap = i === 0 ? "-=0.05" : "-=0.02";

          if (key) tl.to(key, { opacity: 0.6, duration: 0.1 }, gap);
          if (arrow) tl.to(arrow, { opacity: 0.4, duration: 0.1 }, "<");
          if (val) typeChars(tl, val, item.value, 0.014);
        });

        // 3. Show blinking cursor
        tl.call(() => {
          cursorRef.current?.classList.add("currently__cursor--blink");
        });
      },
    });

    return () => st.kill();
  }, []);

  return (
    <section ref={sectionRef} className="section" data-section-index={4}>
      <div ref={labelRef} className="section-label">// currently</div>

      {/* System header with live clock */}
      <div className="currently__header">
        <span ref={headerTextRef}></span>
        <span className="currently__clock">{clock}</span>
      </div>

      {/* Key → value rows (values type out on scroll enter) */}
      <div className="currently">
        {CURRENTLY_ITEMS.map((item, i) => (
          <div className="currently__row" key={item.key}>
            <span
              className="currently__key"
              ref={(el) => { keyRefs.current[i] = el; }}
              style={{ opacity: 0 }}
            >
              {item.key}
            </span>
            <span
              className="currently__arrow"
              ref={(el) => { arrowRefs.current[i] = el; }}
              style={{ opacity: 0 }}
            >
              →
            </span>
            <span
              className="currently__value"
              ref={(el) => { valueRefs.current[i] = el; }}
            />
          </div>
        ))}
      </div>

      {/* Blinking cursor */}
      <span
        className="currently__cursor"
        ref={cursorRef}
        style={{ opacity: 0 }}
      >
        _
      </span>
    </section>
  );
});

// ── Contact (section 5) — Grand Finale ──
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

  // ── Magnetic hover on email + social links ──
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
    <section className="section section--centered" data-section-index={5}>
      <div ref={headlineRef} className="contact__headline">
        let's build <br />
        <span>something.</span>
      </div>
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
      <div ref={footerRef} className="contact__footer">© 2026 Pantorn Chuavallee — built with webgl & liquid glass</div>
    </section>
  );
});
