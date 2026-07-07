import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CircleGeometry,
  InstancedBufferAttribute,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";

import { createStarTexture, createPetalTexture, createBlobTexture, createGradientLUT, createFlareColorLUT, createNoiseTexture, createGlowLUT, createBackdropLUT } from "./textures";
import { backdropVertex, backdropFragment } from "./shaders/backdrop";
import { particleVertex, particleFragment } from "./shaders/particles";
import { flareVertex, flareFragment } from "./shaders/flare";
import { glowVertex, glowFragment } from "./shaders/glow";
import { usePerfSettings } from "./perfStore";
import { useAudioEngine } from "./useAudioEngine";
import { getScrollState } from "./scrollStore";
import { getMouseState } from "./mouseStore";

// Asymmetric envelope — smooth attack, gentle decay.
// Pure function kept at module scope to avoid per-frame allocation.
function env(cur: number, target: number, atk: number, dec: number): number {
  return cur + (target - cur) * (target > cur ? atk : dec);
}

// Map from data-section-index to SECTION_CAMERAS array index.
// section 5 (Currently) is commented out, so indices skip: 0,1,2,3,4,6,7 → 0,1,2,3,4,5,6
// Static — no dependency on reactive values, safe at module scope.
const SECTION_INDEX_MAP: Record<number, number> = {
  0: 0, // hero
  1: 1, // about
  2: 2, // experience
  3: 3, // work
  4: 4, // stack
  6: 5, // contact
  7: 6, // credits
};

// Cached section boundary measurements for per-section camera blending.
// Auto-invalidates after 5s to handle resize/orientation change without
// needing an explicit event listener.
let sectionBoundaries: { top: number; bottom: number }[] | null = null;
let boundaryTimestamp = 0;
const BOUNDARY_TTL_MS = 5000;

function getSectionBoundaries(): { top: number; bottom: number }[] | null {
  const now = performance.now();
  if (!sectionBoundaries || now - boundaryTimestamp > BOUNDARY_TTL_MS) {
    const sections = document.querySelectorAll<HTMLElement>("[data-section-index]");
    if (sections.length === 0) return null;
    const bounds: { top: number; bottom: number }[] = [];
    sections.forEach((s) => {
      const rect = s.getBoundingClientRect();
      bounds.push({
        top: rect.top + window.scrollY,
        bottom: rect.top + window.scrollY + rect.height,
      });
    });
    sectionBoundaries = bounds;
    boundaryTimestamp = now;
  }
  return sectionBoundaries;
}

function generateInstanceData(count: number, maxRadius: number) {
  const pos = new Float32Array(count * 3);
  const rand = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * maxRadius;
    pos[i * 3] = Math.cos(angle) * radius;
    pos[i * 3 + 1] = Math.sin(angle) * radius;
    pos[i * 3 + 2] = Math.random() * -60;

    rand[i * 3] = Math.random();
    rand[i * 3 + 1] = Math.random();
    rand[i * 3 + 2] = Math.random();
  }
  return { pos, rand };
}

export default function KiraKiraVortex() {
  const { paintCount, flareCount } = usePerfSettings();
  // --- Audio reactivity ---
  const { getData } = useAudioEngine();

  // Per-layer smoothing — each visual element responds at a different speed.
  // This creates a staggered cascade: core snaps fast, particles lag behind.
  // Lower factor = slower response = laggy/heavier feel.
  const smooth = useRef({
    coreBass: 0,       // 0.50 — fast attack, the heart pulses with the kick
    sunBass: 0,        // 0.25 — medium, sun follows bass a beat later
    raysTreble: 0,     // 0.40 — rays shimmer with highs
    bridgeMid: 0,      // 0.30 — bridge glows with mids
    particlesMid: 0,   // 0.12 — laggy, particles drift behind the beat
    flaresTreble: 0,   // 0.35 — flares sparkle on treble
    backdropBass: 0,   // 0.08 — barely moves, void breathes slowly
  });

  // --- StrictMode-safe dispose flag ---
  // In dev StrictMode, React mount→unmount→mount. The cleanup would dispose
  // GPU resources that the second mount still references. Deferring disposal
  // to a setTimeout ensures we only dispose on REAL unmount.
  const mountedRef = useRef(true);

  // --- Procedural textures ---
  const starTex = useMemo(() => createStarTexture(), []);
  const petalTex = useMemo(() => createPetalTexture(), []);
  const blobTex = useMemo(() => createBlobTexture(), []);
  const gradLUT = useMemo(() => createGradientLUT(), []);
  const flareColorLUT = useMemo(() => createFlareColorLUT(), []);
  const noiseTex = useMemo(() => createNoiseTexture(), []);
  const glowLUT = useMemo(() => createGlowLUT(), []);
  const backdropLUT = useMemo(() => createBackdropLUT(), []);

  // --- Materials (useMemo — immutable identity, used in JSX render) ---
  // Note: uniforms are mutated per-frame in useFrame below.
  // This is the standard R3F pattern; the react-hooks/immutability
  // and react-hooks/refs rules are disabled for this file in eslint.config.js
  // because React Compiler's purity model is fundamentally incompatible
  // with imperative Three.js uniform mutations.
  const backdropMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uAspect: { value: window.innerWidth / window.innerHeight },
          uBass: { value: 0 },
          uBackdropLUT: { value: backdropLUT },
        },
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        depthWrite: false,
        depthTest: false,
      }),
    [backdropLUT],
  );

  const paintMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 0.15 },
          uTexPetal: { value: petalTex },
          uTexBlob: { value: blobTex },
          uGradLUT: { value: gradLUT },
          uMid: { value: 0 }, // particles follow mid only — laggy drift
        },
        vertexShader: particleVertex,
        fragmentShader: particleFragment,
        transparent: true,
        depthWrite: false,
      }),
    [petalTex, blobTex, gradLUT],
  );

  const flareMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 0.2 },
          uTexStar: { value: starTex },
          uColorLUT: { value: flareColorLUT },
          uTreble: { value: 0 }, // flares sparkle on treble only
        },
        vertexShader: flareVertex,
        fragmentShader: flareFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [starTex, flareColorLUT],
  );

  // MERGED GLOW: Sun + Rays + Bridge + Core in 1 pass
  // Each sub-layer gets its own smoothed uniform for staggered response
  const glowMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uAspect: { value: window.innerWidth / window.innerHeight },
          uTime: { value: 0 },
          uCoreBass: { value: 0 },    // core — fast bass
          uSunBass: { value: 0 },     // sun — slow bass
          uRaysTreble: { value: 0 },  // rays — treble
          uBridgeMid: { value: 0 },   // bridge — mid
          uNoiseTex: { value: noiseTex },
          uGlowLUT: { value: glowLUT },
        },
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    [noiseTex, glowLUT],
  );

  // --- Geometry with instanced attributes ---
  const backdropGeo = useMemo(() => new PlaneGeometry(2, 2), []);
  const glowGeo = useMemo(() => new CircleGeometry(1, 32), []);

  const paintGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(paintCount, 38.0);
    const geo = new PlaneGeometry(0.4, 0.4);
    geo.setAttribute("aInitialPos", new InstancedBufferAttribute(pos, 3));
    geo.setAttribute("aRandoms", new InstancedBufferAttribute(rand, 3));
    return geo;
  }, [paintCount]);

  const flareGeo = useMemo(() => {
    const { pos, rand } = generateInstanceData(flareCount, 10.0);
    const geo = new PlaneGeometry(0.3, 0.3);
    geo.setAttribute("aInitialPos", new InstancedBufferAttribute(pos, 3));
    geo.setAttribute("aRandoms", new InstancedBufferAttribute(rand, 3));
    return geo;
  }, [flareCount]);

  // --- Dispose all GPU resources on unmount (prevents leaks on HMR/route change) ---
  // Deferred: in StrictMode dev, the re-mount sets mountedRef back to true
  // before this timeout fires, so we skip disposal. On real unmount, the
  // ref stays false and disposal proceeds.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setTimeout(() => {
        if (mountedRef.current) return; // StrictMode re-mounted
        [starTex, petalTex, blobTex, gradLUT, flareColorLUT, noiseTex, glowLUT, backdropLUT].forEach((t) => t.dispose());
        [backdropGeo, glowGeo, paintGeo, flareGeo].forEach((g) => g.dispose());
        [backdropMat, paintMat, flareMat, glowMat].forEach((m) =>
          m.dispose(),
        );
      });
    };
  }, []);

  // Scroll-driven camera + particle speed
  // Camera orbits + pulls back based on scroll progress (0–1).
  // Particle speed scales with scroll — vortex intensifies as user descends.
  const { camera } = useThree();
  const camTarget = useRef(new Vector3(0, 0, 5));
  const camLookAt = useRef(new Vector3(0, 0, 0));
  const currentLookAt = useRef(new Vector3(0, 0, 0));

  // Per-section camera positions — each section has a distinct angle.
  // Indexed by data-section-index: hero=0, about=1, exp=2, work=3, stack=4,
  //   contact=6, credits=7. (section 5 is commented out / Currently).
  // On mobile, camera stays further back to prevent the core appearing too large.
  const { tier } = usePerfSettings();
  const MOBILE_Z_OFFSET = tier === "mobile" ? 1.2 : 0;

  const SECTION_CAMERAS = useMemo(() => [
    { pos: [0,    0,    5.5 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 0: hero — pulled back
    { pos: [0.2,  0.15, 5.0 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 1: about — gentle drift right
    { pos: [-0.15, 0.1, 4.8 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 2: experience — slightly closer
    { pos: [0,   -0.15, 5.3 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 3: work — pulled back for h-scroll
    { pos: [0,    0,    5.2 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 4: stack — centered, comfortable
    { pos: [0,    0,    5.0 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 6: contact — centered, slightly closer
    { pos: [0,    0,    5.5 + MOBILE_Z_OFFSET], look: [0, 0, 0] },  // 7: credits — pulled back, near-black bg
  ] as { pos: [number, number, number]; look: [number, number, number] }[], [MOBILE_Z_OFFSET]);

  // Idle-decayed mouse offset
  // When the user hasn't moved the mouse for 2s, this value exponentially
  // decays toward (0, 0), smoothly returning the camera to center.
  const idleMouse = useRef({ x: 0, y: 0 });

  // --- Animation loop ---
  // Accumulate time manually — avoids state.clock.getElapsedTime() which
  // triggers the THREE.Clock deprecation warning (r183+).
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    elapsed.current += delta;
    const t = elapsed.current;
    const raw = getData(); // raw frequency data from AudioEngine
    const s = smooth.current;
    const scroll = getScrollState();

    // Asymmetric envelope per layer — smooth build on attack, gentle fade on decay.
    // Different timing per layer creates natural depth: some elements react fast,
    // others swell slowly. Like different stars twinkling at different speeds
    // in a real galaxy.
    //
    // env(current, target, attack, decay) — module-scope pure function
    // attack = how fast it builds when audio hits (higher = snappier)
    // decay  = how slow it fades after audio passes (lower = longer tail)

    s.coreBass     = env(s.coreBass,     raw.bass,   0.40, 0.08); // clear pulse, medium fade
    s.sunBass      = env(s.sunBass,      raw.bass,   0.20, 0.04); // slow swell, long tail
    s.raysTreble   = env(s.raysTreble,   raw.treble, 0.35, 0.12); // quick shimmer
    s.bridgeMid    = env(s.bridgeMid,    raw.mid,    0.25, 0.06); // medium build
    s.particlesMid = env(s.particlesMid, raw.mid,    0.15, 0.04); // gentle drift
    s.flaresTreble = env(s.flaresTreble, raw.treble, 0.40, 0.10); // quick sparkle
    s.backdropBass = env(s.backdropBass, raw.bass,   0.08, 0.02); // barely breathes

    const aspect = state.size.width / state.size.height;

    paintMat.uniforms.uTime.value = t;
    flareMat.uniforms.uTime.value = t;
    glowMat.uniforms.uTime.value = t;

    glowMat.uniforms.uAspect.value = aspect;
    backdropMat.uniforms.uAspect.value = aspect;

    // Push smoothed audio → materials
    // Glow: 4 sub-layers, each with dedicated smoothed value
    glowMat.uniforms.uCoreBass.value = s.coreBass;
    glowMat.uniforms.uSunBass.value = s.sunBass;
    glowMat.uniforms.uRaysTreble.value = s.raysTreble;
    glowMat.uniforms.uBridgeMid.value = s.bridgeMid;

    // Particles: laggy mid only
    paintMat.uniforms.uMid.value = s.particlesMid;

    // Flares: treble sparkle
    flareMat.uniforms.uTreble.value = s.flaresTreble;

    // Backdrop: barely-there bass breathing
    backdropMat.uniforms.uBass.value = s.backdropBass;

    // ── Scroll-linked camera ──
    // Hybrid section-index + per-section progress interpolation:
    // Uses scrollStore.sectionIndex to pick the correct camera pair (so uneven
    // section heights like Work=1640px on mobile don't skew positions), then
    // blends between current and next camera using per-section progress.
    //
    // Per-section progress is calculated from actual DOM boundaries — how far
    // through the current section the viewport is — NOT from global scroll
    // progress. This ensures smooth camera motion regardless of section height.
    const sectionIdx = SECTION_INDEX_MAP[scroll.sectionIndex] ?? 0;
    const camIdx = Math.min(sectionIdx, SECTION_CAMERAS.length - 1);
    const cur = SECTION_CAMERAS[camIdx];
    const nxt = SECTION_CAMERAS[Math.min(camIdx + 1, SECTION_CAMERAS.length - 1)];

    // Compute segT from actual section positions in the DOM.
    // Falls back to global progress if DOM measurements aren't available yet.
    let segT: number;
    const bounds = getSectionBoundaries();
    const domSections = document.querySelectorAll("[data-section-index]");
    if (bounds && domSections.length > sectionIdx) {
      // Current section's actual DOM boundaries
      const curBound = bounds[sectionIdx];
      const nextBound = bounds[Math.min(sectionIdx + 1, bounds.length - 1)];
      // segT = how far past the current section's midpoint toward the next
      // section's midpoint (0 = at current section center, 1 = at next center)
      const curMid = (curBound.top + curBound.bottom) / 2;
      const nextMid = (nextBound.top + nextBound.bottom) / 2;
      const viewportCenter = window.scrollY + window.innerHeight / 2;
      segT = Math.max(0, Math.min(1, (viewportCenter - curMid) / Math.max(1, nextMid - curMid)));
    } else {
      // Fallback: global progress (pre-fix behavior, only at mount before DOM ready)
      const segCount = SECTION_CAMERAS.length - 1;
      segT = Math.max(0, Math.min(1, (scroll.progress * segCount) - camIdx));
    }

    // Idle-decayed mouse parallax
    // When the cursor hasn't moved for 2 seconds, the parallax offset
    // exponentially decays toward zero — the camera slowly drifts back
    // to center on its own.
    const mouse = getMouseState();
    const IDLE_TIMEOUT = 5000;    // 5 seconds of no movement → start decaying
    const DECAY = 0.97;           // per-frame multiplier (~1.5s to mostly return)
    const now = performance.now();
    if (mouse.lastMoveTime > 0 && now - mouse.lastMoveTime > IDLE_TIMEOUT) {
      idleMouse.current.x *= DECAY;
      idleMouse.current.y *= DECAY;
    } else {
      idleMouse.current.x = mouse.x;
      idleMouse.current.y = mouse.y;
    }

    // Interpolate camera position between current and next section + mouse offset
    camTarget.current.set(
      cur.pos[0] + (nxt.pos[0] - cur.pos[0]) * segT + idleMouse.current.x * 0.3,
      cur.pos[1] + (nxt.pos[1] - cur.pos[1]) * segT + idleMouse.current.y * 0.2,
      cur.pos[2] + (nxt.pos[2] - cur.pos[2]) * segT,
    );
    camera.position.lerp(camTarget.current, 0.05);

    // Look-at shifts subtly with mouse — sun drifts, not locked to center
    camLookAt.current.set(idleMouse.current.x * 0.1, idleMouse.current.y * 0.08, 0);
    currentLookAt.current.lerp(camLookAt.current, 0.05);
    camera.lookAt(currentLookAt.current);

    // Particle speed follows scroll velocity
    // Smooth uSpeed toward target — prevents position jumps when speed changes.
    // (Shader computes pos = uTime * uSpeed, so sudden speed changes teleport
    // all particles. Lerp the uniform at 5%/frame for gradual acceleration.)
    const velBoost = Math.min(Math.abs(scroll.velocity) / 200, 0.6);
    const targetSpeed = 0.15 + scroll.progress * 0.25 + velBoost * 0.15;
    paintMat.uniforms.uSpeed.value += (targetSpeed - paintMat.uniforms.uSpeed.value) * 0.05;
    const targetFlareSpeed = targetSpeed * 1.2 + velBoost * 0.2;
    flareMat.uniforms.uSpeed.value += (targetFlareSpeed - flareMat.uniforms.uSpeed.value) * 0.05;
  });

  return (
    <>
      {/* 1. Backdrop (Far distance void) */}
      <mesh geometry={backdropGeo} material={backdropMat} renderOrder={-5} />

      {/* 2. Merged Glow (Sun + Rays + Bridge + Core — single pass, circular geometry to avoid square ghosting) */}
      <mesh geometry={glowGeo} material={glowMat} renderOrder={-4} />

      {/* 3. Particles (instanced — audio-reactive drift) */}
      <instancedMesh
        key={`paint-${paintCount}`}
        args={[paintGeo, paintMat, paintCount]}
        frustumCulled={false}
        renderOrder={1}
      />

      {/* 4. Saturated Star Flares (Drawn on the absolute top layer) */}
      <instancedMesh 
        key={`flare-${flareCount}`}
        args={[flareGeo, flareMat, flareCount]} 
        frustumCulled={false} 
        renderOrder={2}
      />
    </>
  );
}
