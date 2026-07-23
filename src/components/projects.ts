// ── Project data ──
// Separated from Glass.tsx for react-refresh compatibility

export const PROJECTS = [
  { num: "01", title: "senzen", stack: "next.js · go (fiber) · postgresql · docker", url: "https://github.com/Long104/Senzen" },
  { num: "02", title: "kalifinder", stack: "opensearch · bedrock · ecs fargate · terraform", url: "#" },
  { num: "03", title: "ai-clipboard-ext", stack: "plasmo · llama 3.3 · cloudflare workers", url: "https://github.com/Long104/AI-Clipboard-extension" },
  { num: "04", title: "style-war", stack: "next.js · go (gin) · websockets · clerk", url: "#" },
  { num: "05", title: "ttt-online", stack: "bun · hono · socket.io · next.js", url: "https://github.com/Long104/tictactoe" },
] as const;
