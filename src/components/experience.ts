// ── Experience data (from resume) ──

export interface ExperienceItem {
  readonly period: string;
  readonly role: string;
  readonly company?: string;
  readonly location?: string;
  readonly description?: string;
  readonly isCurrent?: boolean;
  readonly isEducation?: boolean;
}

export const EXPERIENCE: readonly ExperienceItem[] = [
  {
    period: "jun 2025 — dec 2025",
    role: "software engineer intern",
    company: "omise (opn)",
    location: "bangkok, thailand",
    description:
      "shipped production UI fixes on the merchant dashboard (vite + design system), fixed i18n language-switching bugs on the payment page, and upgraded next.js 14→15 + buildkite CI. ran POCs for launchdarkly feature flags, mixpanel analytics, and aws quicksight dashboards.",
  },
  {
    period: "nov 2022 — dec 2025",
    role: "b.sc. information technology",
    company: "stamford international university",
    description: "gpa 3.78 / 4.00 — workshops on docker, css battle, and web fundamentals.",
    isEducation: true,
  },
];

export const CURRENT_STATUS = "it graduate — open to software engineer roles";
