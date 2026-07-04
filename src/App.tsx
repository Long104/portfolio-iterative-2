import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import "./fonts.css";
import type { ScrollContainerHandle } from "./components/ScrollContainer";
import { setScrollState } from "./scrollStore";
import { setMouseState } from "./mouseStore";
import { ScrollTrigger } from "./lib/gsap";
import { useParallax } from "./hooks/useParallax";
import { requestOrientationPermission } from "./useDeviceOrientation";

const Scene = lazy(() => import("./Scene"));
const ScrollContainer = lazy(() =>
  import("./components/ScrollContainer").then((m) => ({
    default: m.ScrollContainer,
  })),
);
import { useAudioEngine, TRACKS } from "./useAudioEngine";
import { PsycommuBoot } from "./components/PsycommuBoot";
import { NavPill } from "./components/NavPill";
import { NavOverlay } from "./components/NavOverlay";
import { AudioBar } from "./components/AudioBar";
import { CursorOverlay } from "./components/CursorOverlay";
import { ProjectDetail } from "./components/ProjectDetail";
import type { Project } from "./components/projects";
import { initAudioUI } from "./lib/audio-ui";

import {
  HeroSection,
  AboutSection,
  ExperienceSection,
  WorkSection,
  CurrentlySection,
  ContactSection,
} from "./components/Sections";
import { StackSection } from "./components/Armament";

type Theme = "gquuuuuux" | "gfreed";

function App() {
  const [started, setStarted] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const [bootPhase, setBootPhase] = useState<"enter" | "exit" | "gone">("enter");
  const [activeSection, setActiveSection] = useState(0);
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("kira-theme") as Theme) || "gquuuuuux",
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const scrollRef = useRef<ScrollContainerHandle>(null);

  // Apply theme to root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "gfreed") {
      root.setAttribute("data-theme", "gfreed");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("kira-theme", theme);
  }, [theme]);
  const {
    isLoading,
    error,
    isPlaying,
    isPreloaded,
    toggle,
    currentTrack,
    warmUp,
    preload,
    engage,
    loadTrack,
    crossfadeTo,
    warmPreload,
  } = useAudioEngine();

  // Preload default track (during boot)
  useEffect(() => {
    if (!isPreloaded) preload(currentTrack);
  }, []); // mount only

  // Pre-mount content during boot (behind overlay)
  // Mounts ScrollContainer + Sections 800ms after page load so SplitText,
  // Lenis, and ScrollTrigger are warm before the user clicks LAUNCH.
  // Prevents the 100-300ms frame freeze that was eating the GSAP exit animation.
  useEffect(() => {
    const t = setTimeout(() => setContentMounted(true), 800);
    return () => clearTimeout(t);
  }, []); // mount only

  // Refresh triggers after fonts land
  // Font loading causes text reflow → trigger positions shift.
  // This fires once when all fonts are ready (before or after boot exit).
  useEffect(() => {
    if (!document.fonts) return;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ScrollTrigger.refresh();
    });
    return () => { cancelled = true; };
  }, []);

  // Lock body scroll during boot
  // Content is pre-mounted 800ms after page load (behind the boot overlay).
  // Without this, users can scroll the hidden content during the boot sequence,
  // leaving it in a random position when LAUNCH fires.
  useEffect(() => {
    if (started) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [started]);

  // Scroll progress (rAF-throttled, writes to scrollStore for R3F)
  // Also writes to global scrollStore for R3F to read in useFrame (no React re-render).
  useEffect(() => {
    if (!started) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = document.body.scrollHeight - window.innerHeight;
        const pct = max > 0 ? window.scrollY / max : 0;
        setScrollState({ progress: pct });
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [started]);

  // Mouse parallax (rAF-throttled, writes to mouseStore for R3F)
  useEffect(() => {
    if (!started) return;
    let ticking = false;
    function onMouseMove(e: MouseEvent) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;   // -1 (left) to 1 (right)
        const y = -(e.clientY / window.innerHeight) * 2 + 1;  // 1 (top) to -1 (bottom)
        setMouseState({ x, y, lastMoveTime: performance.now() });
        ticking = false;
      });
    }
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [started]);

  const handleStart = useCallback(async () => {
    requestOrientationPermission(); // iOS 13+: must be inside user gesture
    initAudioUI(); // create AudioContext inside trusted click
    setBootPhase("exit"); // start GSAP cinematic exit (flash + scale + scramble)
    setStarted(true); // show post-launch UI + enable scroll tracking
    if (isPreloaded) {
      await engage();
    } else {
      await loadTrack(currentTrack);
    }
    // Preload the other track in background (instant switch later)
    // Runs silently after LAUNCH — by the time user touches AudioBar (10-30s
    // later), the buffer is decoded and cached. Switch becomes a crossfade.
    const otherTrack = TRACKS.find((t) => t.url !== currentTrack);
    if (otherTrack) warmPreload(otherTrack.url);
  }, [isPreloaded, engage, loadTrack, currentTrack, warmPreload]);

  const handleSelectTrack = useCallback(async (url: string) => {
    requestOrientationPermission(); // iOS 13+: must be inside user gesture
    initAudioUI(); // create AudioContext inside trusted click
    if (url === currentTrack) {
      if (!isPlaying) await engage();
      return;
    }
    // Crossfade: 1.5s fade-out current → 1.5s fade-in new track
    // Uses cached buffer if preloaded — no network wait.
    const previousTrack = currentTrack; // capture before state updates
    await crossfadeTo(url);
    // Keep the track we just left in cache — user might switch back
    warmPreload(previousTrack);
  }, [currentTrack, isPlaying, engage, crossfadeTo, warmPreload]);

  const handleExitComplete = useCallback(() => {
    setBootPhase("gone");
    // Recalculate all ScrollTriggers after boot overlay animates away.
    // Content was mounted 800ms after page load — fonts/layout may have
    // shifted since triggers were created. This ensures correct positions.
    ScrollTrigger.refresh();
  }, []);

  const handleSectionChange = useCallback((index: number) => {
    setActiveSection(index);
    setScrollState({ sectionIndex: index });
    document.documentElement.setAttribute("data-active-section", String(index));
  }, []);

  const handleOpenProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const handleCloseProject = useCallback(() => {
    setSelectedProject(null);
  }, []);

  const bootPhaseNarrowed: "enter" | "exit" = bootPhase === "gone" ? "exit" : bootPhase;

  // Parallax: glass panels float on scroll
  // Activates after LAUNCH when content is visible.
  useParallax(
    ".glass-panel",
    30,
    1.5,
    started,
  );

  return (
    <>
      {/* ── Layer 0: Fixed 3D canvas (vortex) ── */}
      <div className="canvas-layer">
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>

      {/* ── Layer 1: Scrollable content (pre-mounted during boot) ── */}
      {contentMounted && (
        <Suspense fallback={<div className="content-layer" />}>
          <ScrollContainer ref={scrollRef} onSectionChange={handleSectionChange} paused={!started} locked={selectedProject !== null}>
            <HeroSection started={started} />
            <AboutSection />
            <ExperienceSection />
            <WorkSection started={started} onOpenProject={handleOpenProject} hidden={selectedProject !== null} />
            <StackSection />
            <CurrentlySection />
            <ContactSection />
          </ScrollContainer>
        </Suspense>
      )}

      {/* ── Layer 2: Nav (always visible after start) ── */}
      {started && (
        <>
          <NavPill
            activeIndex={activeSection}
            onNavigate={(i) => scrollRef.current?.scrollToSection(i)}
          />
          <NavOverlay
            activeIndex={activeSection}
            onNavigate={(i) => scrollRef.current?.scrollToSection(i)}
          />
        </>
      )}

      {/* ── Psycommu Boot Sequence ── */}
      {bootPhase !== "gone" && (
        <PsycommuBoot
          phase={bootPhaseNarrowed}
          isLoading={isLoading}
          error={error}
          onStart={handleStart}
          onWarmUp={warmUp}
          onExitComplete={handleExitComplete}
        />
      )}

      {/* ── Layer 3: Cursor overlay (desktop only, self-gated) ── */}
      <CursorOverlay />

      {/* ── Project detail overlay ── */}
      <ProjectDetail project={selectedProject} onClose={handleCloseProject} />

      {/* ── Audio control bar ── */}
      {started && (
        <AudioBar
          isPlaying={isPlaying}
          currentTrack={currentTrack}
          theme={theme}
          toggle={toggle}
          handleSelectTrack={handleSelectTrack}
          onToggleTheme={() => setTheme((t) => (t === "gquuuuuux" ? "gfreed" : "gquuuuuux"))}
        />
      )}
    </>
  );
}

export default App;
