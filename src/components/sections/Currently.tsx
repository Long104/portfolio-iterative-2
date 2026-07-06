// ── Currently section — live readout ──
// Terminal typewriter: header types out, clock ticks live,
// each row's value types sequentially. Blinking cursor at the end.

import { useRef, useEffect, useState, memo } from "react";
import { gsap, ScrollTrigger, PREFERS_REDUCED_MOTION } from "../../lib/gsap";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { GlassPanel } from "../Glass";

const CURRENTLY_ITEMS = [
  { key: "learning", value: "WebGPU, system design, distributed systems" },
  { key: "building", value: "this site — 3D tunnel with audio-reactive particles" },
  { key: "reading", value: "Designing Data-Intensive Applications" },
  { key: "playing", value: "chess (1200 elo), rubik's cube (sub-30s pb)" },
  { key: "watching", value: "gundam gquuuuuux" },
] as const;

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

        typeChars(tl, headerTextRef.current!, "> LOCATION: bangkok —", 0.018);

        CURRENTLY_ITEMS.forEach((item, i) => {
          const key = keyRefs.current[i];
          const arrow = arrowRefs.current[i];
          const val = valueRefs.current[i];
          const gap = i === 0 ? "-=0.05" : "-=0.02";

          if (key) tl.to(key, { opacity: 0.6, duration: 0.1 }, gap);
          if (arrow) tl.to(arrow, { opacity: 0.4, duration: 0.1 }, "<");
          if (val) typeChars(tl, val, item.value, 0.014);
        });

        tl.call(() => {
          cursorRef.current?.classList.add("currently__cursor--blink");
        });
      },
    });

    return () => st.kill();
  }, []);

  return (
    <section ref={sectionRef} className="section" data-section-index={5}>
      <div ref={labelRef} className="section-label">currently</div>

      <GlassPanel>
        <div className="currently__header">
          <span ref={headerTextRef}></span>
          <span className="currently__clock">{clock}</span>
        </div>

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

        <span
          className="currently__cursor"
          ref={cursorRef}
          style={{ opacity: 0 }}
        >
          _
        </span>
      </GlassPanel>
    </section>
  );
});
