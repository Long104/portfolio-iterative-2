// ── Error Boundary ──
// Catches render errors from WebGL context loss, shader compile failures,
// refractive lib exceptions, or any thrown render. Prevents a single
// failure from unrecoverably crashing the entire app.

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            background: "#000508",
            color: "rgba(255,255,255,0.85)",
            fontFamily: "ui-monospace, monospace",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FF4FD8" }}>
            System Error
          </div>
          <div style={{ fontSize: 13, opacity: 0.6, maxWidth: 400 }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: "8px 24px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.85)",
              fontFamily: "inherit",
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
