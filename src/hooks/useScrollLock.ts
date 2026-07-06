// ── useScrollLock — ref-counted body scroll lock ──
// Multiple components can lock/unlock independently without overwriting
// each other. When lockCount > 0, body.overflow = "hidden".
// When lockCount drops to 0, body.overflow is restored.

import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [locked]);
}
