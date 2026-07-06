// ── useSlidingIndicator — GSAP animated sliding indicator ──
// Shared by NavPill and AudioBar for the segmented-control indicator
// that slides to the active item. First paint is instant (gsap.set),
// subsequent changes animate smoothly.

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react";
import { gsap } from "../lib/gsap";

export function useSlidingIndicator(
  indicatorRef: RefObject<HTMLElement | null>,
  itemsRef: MutableRefObject<(HTMLElement | null)[]>,
  activeIndex: number,
) {
  const initialised = useRef(false);

  useEffect(() => {
    const indicator = indicatorRef.current;
    const target = itemsRef.current[activeIndex];
    if (!indicator || !target) return;

    const parent = indicator.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const left = targetRect.left - parentRect.left;
    const w = targetRect.width;

    if (!initialised.current) {
      initialised.current = true;
      gsap.set(indicator, { left, width: w });
      return;
    }

    const anim = gsap.to(indicator, {
      left,
      width: w,
      duration: 0.4,
      ease: "power3.out",
      overwrite: "auto",
    });

    return () => { anim.kill(); };
  }, [activeIndex, indicatorRef, itemsRef]);
}
