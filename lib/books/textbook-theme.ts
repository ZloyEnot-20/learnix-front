/**
 * Academic English textbook page tokens.
 * Shared look for teacher Live Lessons book pages and mobile unit viewer.
 */
export const TEXTBOOK = {
  pageBg: "#f0f2f5",
  content: "#ffffff",
  text: "#1a1a1a",
  heading: "#2c3e50",
  headingAccent: "#2980b9",
  accent: "#3498db",
  accentSoft: "#d6eaf8",
  accentWash: "#eaf2f8",
  accentDeep: "#1a5276",
  correct: "#27ae60",
  correctSoft: "#e8f8f5",
  correctDeep: "#0e6655",
  orangeSoft: "#fdebd0",
  orange: "#a04000",
  tipSoft: "#fef9e7",
  tip: "#f1c40f",
  tipBorder: "#f9e79f",
  tipText: "#7d6608",
  audio: "#e74c3c",
  muted: "#7f8c8d",
  mutedSoft: "#ecf0f1",
  border: "#dce1e6",
  borderAlt: "#e8eaed",
  exerciseBg: "#f8f9fa",
  shadow: "0 2px 20px rgba(0,0,0,0.1)",
  font: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  /** Compact textbook scale — keep pages denser on mobile/desktop. */
  type: {
    unitTitle: 22,
    unitSubtitle: 14,
    section: 16,
    body: 13,
    bodyLh: 1.45,
    instruction: 13,
    caption: 11,
    chip: 12,
    exLabel: 13,
  },
  space: {
    pagePadX: 12,
    pagePadY: 12,
    exercisePadY: 8,
    exercisePadX: 10,
    exerciseGap: 12,
    sectionMb: 10,
  },
} as const

/** @deprecated Use TEXTBOOK — kept for import compatibility during rename. */
export const CAMBRIDGE = {
  deep: TEXTBOOK.heading,
  mid: TEXTBOOK.headingAccent,
  soft: TEXTBOOK.accentSoft,
  wash: TEXTBOOK.pageBg,
  line: TEXTBOOK.border,
  note: TEXTBOOK.muted,
  pageBg: TEXTBOOK.pageBg,
  page: TEXTBOOK.content,
} as const
