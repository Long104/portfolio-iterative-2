# kira-gem-3d-tunnel

Portfolio of Pantorn Chuavallee — software engineer.

Audio-reactive 3D vortex built with React 19, Three.js (R3F), GSAP, and custom GLSL shaders. Designed as a Gundam cockpit aesthetic: refractive glass panels, procedural lens flares, and scroll-linked camera choreography.

## Stack

- React 19 + TypeScript + Vite
- Three.js via @react-three/fiber
- GSAP (ScrollTrigger, timelines)
- Refractive glass (refractive library)
- Web Audio API (procedural UI sounds + audio-reactive shaders)

## Develop

```bash
npm install
npm run dev      # localhost:3000
npm run build    # production build
npm run preview  # preview production build
npm run deploy   # build + deploy to Cloudflare Pages
```

## Structure

```
src/
├── KiraKiraVortex.tsx    # Main 3D scene — shaders, camera, audio reactivity
├── SparkleSystem.tsx     # Chromatic lens flare particle system
├── useAudioEngine.ts     # Web Audio frequency analysis
├── perf.ts               # Device detection + adaptive particle counts
├── shaders/              # GLSL vertex + fragment shaders
├── components/           # UI overlay (glass panels, nav, cursor, sections)
├── hooks/                # Scroll, parallax, orientation hooks
└── lib/                  # GSAP config, audio-ui sound effects
```
