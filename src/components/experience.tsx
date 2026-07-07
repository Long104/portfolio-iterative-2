import type { ReactNode } from "react";

// ── Experience data ──

export interface ExperienceItem {
  readonly period: string;
  readonly role: string;
  readonly company?: string;
  readonly location?: string;
  readonly description?: string | ReactNode;
  readonly isCurrent?: boolean;
  readonly isEducation?: boolean;
}

export const EXPERIENCE: readonly ExperienceItem[] = [
  {
    period: "jun 2025 — dec 2025",
    role: "software engineer intern",
    company: "omise (opn)",
    location: "bangkok, thailand",
    description: (
      <>
        six months at <span className="keyword">omise (opn)</span> — shipped UI fixes on the merchant dashboard (<span className="keyword">vite</span> + design system), fixed i18n bugs on the payment page, upgraded <span className="keyword">next.js 14→15</span> through <span className="keyword">buildkite CI</span>. also ran POCs for <span className="keyword">launchdarkly</span>, <span className="keyword">mixpanel</span>, and <span className="keyword">aws quicksight</span> to test what might ship next.
      </>
    ),
  },
  {
    period: "nov 2022 — dec 2025",
    role: "b.sc. information technology",
    company: "stamford international university",
    description: (
      <>
        gpa 3.78 / 4.00 — workshops on <span className="keyword">docker</span>, <span className="keyword">css battle</span>, and web fundamentals.
      </>
    ),
    isEducation: true,
  },
];

export const CURRENT_STATUS = "based in bangkok — open to opportunities";
