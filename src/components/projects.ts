// ── Project data ──
// Separated from Glass.tsx for react-refresh compatibility
//
// Each project has an image field: a CSS gradient string used as a
// placeholder background. Gradients are abstract energy-scan visuals
// that match the cockpit/Gundam aesthetic.

export interface Project {
  readonly num: string;
  readonly title: string;
  readonly stack: string;
  readonly desc: string;
  readonly url: string;
  /** CSS gradient used as placeholder project image */
  readonly image: string;
}

export const PROJECTS: readonly Project[] = [
  {
    num: "01",
    title: "nebula engine",
    stack: "typescript · webgl · glsl",
    desc: "A volumetric particle renderer that simulates interstellar gas clouds in real-time. Built from scratch on raw WebGL.",
    url: "#",
    image: "linear-gradient(135deg, #1a1040 0%, #3d1f8a 40%, #7a4fd4 70%, #b088ff 100%)",
  },
  {
    num: "02",
    title: "kira-kira vortex",
    stack: "react · three.js · audio api",
    desc: "Immersive audio-visual tunnel experience. The 3D vortex pulses to music frequency analysis in real-time.",
    url: "#",
    image: "linear-gradient(135deg, #0d3b66 0%, #1a7ab5 40%, #4ab8e8 70%, #80d8ff 100%)",
  },
  {
    num: "03",
    title: "realtime collab",
    stack: "typescript · websockets · yjs",
    desc: "Peer-to-peer collaborative editor with CRDT-based conflict resolution. Multiple users edit the same document simultaneously.",
    url: "#",
    image: "linear-gradient(135deg, #4a1020 0%, #8a2035 40%, #d04055 70%, #ff7080 100%)",
  },
  {
    num: "04",
    title: "shader playground",
    stack: "glsl · webgpu · vite",
    desc: "Interactive GLSL editor with live preview, shader graph visualizer, and a library of 50+ community shader examples.",
    url: "#",
    image: "linear-gradient(135deg, #0d3d1a 0%, #1a7a35 40%, #40b860 70%, #70f090 100%)",
  },
  {
    num: "05",
    title: "edge functions",
    stack: "rust · wasm · cloudflare",
    desc: "High-performance serverless functions compiled to WebAssembly. Image processing, JSON parsing, and data transformation at the edge.",
    url: "#",
    image: "linear-gradient(135deg, #3d3d0d 0%, #7a7a1a 40%, #b8b840 70%, #f0f070 100%)",
  },
] as const;
