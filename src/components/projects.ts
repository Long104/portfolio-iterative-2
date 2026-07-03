// ── Project data ──
// Real projects from pantorn's portfolio

export interface Project {
  readonly num: string;
  readonly title: string;
  readonly stack: string;
  readonly desc: string;
  /** Main link (project URL or live demo) */
  readonly url: string;
  /** GitHub repository URL */
  readonly github: string;
  /** Path to screenshot image in public/ */
  readonly image: string;
  /** Long-form case study description for overlay */
  readonly longDescription: string;
  /** Tech stack as individual tags */
  readonly techs: readonly string[];
  /** Key features / accomplishments */
  readonly highlights: readonly string[];
}

export const PROJECTS: readonly Project[] = [
  {
    num: "01",
    title: "cashwise",
    stack: "go · next.js · react query · postgres",
    desc: "Full-stack expense tracker with Go (Fiber) backend, React Query for cache invalidation, JWT auth, and Docker + Kubernetes deployment.",
    url: "https://github.com/Long104/CashWise",
    github: "https://github.com/Long104/CashWise",
    image: "/cashwise.jpg",
    longDescription:
      "A full-stack personal finance app where users log spending and view trends. Built with Next.js, React Query (chosen over manual fetch/useEffect for cache invalidation and fewer redundant API calls) and Zustand for lightweight global state. Backend in Go (Fiber) with GORM over PostgreSQL, OAuth login with JWT session handling. Containerized with Docker and deployed on Vercel with CI/CD.",
    techs: ["go (fiber)", "next.js", "react query", "zustand", "gorm", "postgresql", "docker", "kubernetes"],
    highlights: [
      "React Query for cache invalidation — fewer redundant API calls",
      "Go (Fiber) backend with GORM + PostgreSQL, OAuth + JWT auth",
      "Docker containerization with local Kubernetes orchestration",
      "CI/CD pipeline deployed on Vercel",
    ],
  },
  {
    num: "02",
    title: "notion clone",
    stack: "react · liveblocks · firebase",
    desc: "Real-time collaborative editor with AI translation. Clerk auth, Liveblocks for multi-user editing, Blocknote text editor, Cloudflare Workers for AI.",
    url: "https://notion-clone-opal.vercel.app",
    github: "https://github.com/Long104/notion-clone",
    image: "/notion-clone.jpg",
    longDescription:
      "A real-time collaborative document editor inspired by Notion, featuring live multi-user editing, AI-powered translation, and a rich block-based text editor. Authentication handled by Clerk, real-time sync powered by Liveblocks, and AI features running on Cloudflare Workers edge.",
    techs: ["react", "liveblocks", "firebase", "clerk", "cloudflare workers", "typescript"],
    highlights: [
      "Live multi-user editing with Liveblocks and presence cursors",
      "AI translation and summarization via Cloudflare Workers",
      "Block-based text editor with Blocknote for rich formatting",
      "Clerk authentication with OAuth and session management",
    ],
  },
  {
    num: "03",
    title: "clipboard ai",
    stack: "plasmo · cloudflare workers · llama 3.3",
    desc: "Cross-browser AI clipboard extension (Chrome + Firefox from one codebase). Sidebar chat powered by LLaMA 3.3 on Cloudflare Workers edge.",
    url: "https://github.com/Long104/AI-Clipboard-extension",
    github: "https://github.com/Long104/AI-Clipboard-extension",
    image: "/clipboard-ai.jpg",
    longDescription:
      "A Chrome & Firefox extension built with Plasmo + React for cross-browser compatibility from one codebase. Select text on any webpage and ask LLaMA 3.3 to explain, summarize, translate, or elaborate. Routed clipboard text to Cloudflare AI Workers — chosen over a self-hosted model to avoid GPU costs while keeping inference under ~3s. Backend logic on Cloudflare Workers + Hono.",
    techs: ["plasmo", "react", "cloudflare workers", "hono", "llama 3.3", "typescript"],
    highlights: [
      "Cross-browser from one codebase (Chrome + Firefox) via Plasmo",
      "LLaMA 3.3 inference on Cloudflare Workers — sub-3s response, no GPU costs",
      "Backend on Cloudflare Workers + Hono framework",
      "Works on any website — sidebar chat with text selection context",
    ],
  },
] as const;
