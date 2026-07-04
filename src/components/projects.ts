// ── Portfolio projects ──
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
    desc: "Expense tracker — Go (Fiber) backend, React Query for cache invalidation, JWT auth, Docker + Kubernetes.",
    url: "https://github.com/Long104/CashWise",
    github: "https://github.com/Long104/CashWise",
    image: "/webp/cashwise.webp",
    longDescription:
      "Track spending, spot trends. Next.js + React Query (picked over manual fetch to cut redundant API calls), Zustand for global state. Go (Fiber) backend with GORM + PostgreSQL, OAuth + JWT sessions. Docker, deployed on Vercel with CI/CD.",
    techs: ["go (fiber)", "next.js", "react query", "zustand", "gorm", "postgresql", "docker", "kubernetes"],
    highlights: [
      "React Query for cache invalidation — fewer redundant API calls",
      "Go (Fiber) backend with GORM + PostgreSQL, OAuth + JWT auth",
      "Docker + Kubernetes local orchestration",
      "CI/CD pipeline deployed on Vercel",
    ],
  },
  {
    num: "02",
    title: "notion clone",
    stack: "react · liveblocks · firebase",
    desc: "Collaborative doc editor — live multi-user editing, AI translation, block-based text editor. Clerk + Liveblocks + Cloudflare Workers.",
    url: "https://notion-clone-opal.vercel.app",
    github: "https://github.com/Long104/notion-clone",
    image: "/webp/notion-clone.webp",
    longDescription:
      "Notion-lite with live multi-user editing, AI translation, and a block-based editor. Clerk handles auth, Liveblocks syncs cursors in real time, Cloudflare Workers runs AI inference.",
    techs: ["react", "liveblocks", "firebase", "clerk", "cloudflare workers", "typescript"],
    highlights: [
      "Live multi-user editing with Liveblocks and presence cursors",
      "AI translation and summarization via Cloudflare Workers",
      "Block-based text editor with Blocknote",
      "Clerk authentication with OAuth and session management",
    ],
  },
  {
    num: "03",
    title: "clipboard ai",
    stack: "plasmo · cloudflare workers · llama 3.3",
    desc: "Chrome + Firefox extension. Select any text, ask LLaMA 3.3 to explain or translate — Cloudflare Workers edge, no GPU costs.",
    url: "https://github.com/Long104/AI-Clipboard-extension",
    github: "https://github.com/Long104/AI-Clipboard-extension",
    image: "/webp/clipboard-ai.webp",
    longDescription:
      "Chrome + Firefox from one Plasmo codebase. Select any text on any page and LLaMA 3.3 explains, summarizes, or translates it. Runs on Cloudflare Workers edge — no GPU costs, inference under ~3s. Backend: Cloudflare Workers + Hono.",
    techs: ["plasmo", "react", "cloudflare workers", "hono", "llama 3.3", "typescript"],
    highlights: [
      "Cross-browser from one codebase (Chrome + Firefox) via Plasmo",
      "LLaMA 3.3 inference on Cloudflare Workers — sub-3s response, no GPU costs",
      "Backend on Cloudflare Workers + Hono framework",
      "Works on any website — sidebar chat with text selection context",
    ],
  },
  {
    num: "04",
    title: "kalifinder",
    stack: "aws · opensearch · bedrock · ecs",
    desc: "AI product search for Shopify & WordPress. OpenSearch full-text + k-NN vector search, AWS Bedrock image embeddings, ECS Fargate.",
    url: "https://github.com/Long104/Kalifinder",
    github: "https://github.com/Long104/Kalifinder",
    image: "/webp/kalifinder.webp",
    longDescription:
      "Team project — AI product search widget for Shopify and WordPress. Sync pipeline with idempotent upserts (retries without duplicates). OpenSearch handles full-text, faceted filtering, and k-NN vector similarity in one query. AWS Bedrock generates image embeddings for 'find similar products' — no self-hosted ML. ECS Fargate with auto-scaling, React widget on S3 + CloudFront. All infra in Terraform.",
    techs: ["aws ecs", "opensearch", "aws bedrock", "react", "s3", "cloudfront", "terraform", "sqs"],
    highlights: [
      "Product sync pipeline with idempotent upserts — safe retry handling",
      "OpenSearch: full-text + faceted filtering + k-NN vector similarity in one query",
      "AWS Bedrock image embeddings for 'find similar' — no self-hosted ML",
      "ECS Fargate auto-scaling + S3/CloudFront widget + Terraform IaC",
    ],
  },
] as const;
