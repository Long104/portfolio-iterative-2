// ── Hero — cinematic name reveal ──
// Two-phase approach: SplitText hide on mount, play timeline on LAUNCH.
// Phase 3: mouse-following 3D tilt after reveal completes.

import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, PREFERS_REDUCED_MOTION } from "../../lib/gsap";
import { getMouseState } from "../../mouseStore";
import { GlassSmall } from "../Glass";

export function HeroSection({ started }: { started: boolean }) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<{ lines: Element[] } | null>(null);

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

    tl.to(split.lines, {
      yPercent: 0,
      opacity: 1,
      stagger: 0.14,
      duration: 1.0,
      ease: "expo.out",
    });

    tl.to(roleRef.current, {
      opacity: 1, y: 0, duration: 0.5, ease: "power2.out",
    }, "-=0.4");

    tl.to(taglineRef.current, {
      opacity: 1, y: 0, duration: 0.5, ease: "power2.out",
    }, "-=0.3");

    return () => {
      tl.kill();
    };
  }, [started]);

  useEffect(() => {
    if (!started || PREFERS_REDUCED_MOTION) return;
    const el = nameRef.current;
    if (!el) return;

    function onTick() {
      const { x, y } = getMouseState();
      el!.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 3}deg)`;
    }

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
          pantorn <span>chuavallee</span>
        </h1>
        <GlassSmall ref={roleRef} className="hero__role">
          software engineer
        </GlassSmall>
        <div ref={taglineRef} className="hero__tagline"></div>
      </div>
      <div className="hero__scroll-hint">↓ scroll</div>
    </section>
  );
}
