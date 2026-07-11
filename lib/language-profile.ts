import type { LanguageTopicStat, StudentLanguageProfile, LearnixLevelCatalogueEntry } from "@/lib/api"

/** Learnix internal level (1–9) → CEFR label. */
const LEARNIX_TO_CEFR = ["", "A1", "A2", "A2", "B1", "B1", "B2", "B2", "C1", "C2"] as const

export const CEFR_LEVEL_COLORS: Record<string, string> = {
  A1: "#10B981",
  A2: "#84CC16",
  B1: "#0EA5E9",
  B2: "#F59E0B",
  C1: "#F43F5E",
  C2: "#A855F7",
}

export function learnixLevelToCefr(level: number): string {
  const clamped = Math.max(1, Math.min(9, Math.round(level)))
  return LEARNIX_TO_CEFR[clamped] ?? "A1"
}

export function formatTopicLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function scoreClass(score: number): string {
  if (score >= 750) return "text-emerald-700"
  if (score >= 550) return "text-sky-700"
  if (score >= 350) return "text-amber-700"
  return "text-rose-700"
}

/** Learnix score (0–1000) → IELTS band equivalent (4.0–9.0, step 0.5). */
export function learnixScoreToIeltsBand(score: number): number {
  const clamped = Math.max(0, Math.min(1000, score))
  const raw = 4 + (clamped / 1000) * 5
  return Math.round(raw * 2) / 2
}

/**
 * Teacher speaking grade on the 0–9 scale → Learnix score (0–1000).
 * Matches backend legacy mapping: (band / 9) * 1000.
 */
export function speakingBandToLearnixScore(band: number): number {
  const clamped = Math.max(0, Math.min(9, band))
  return Math.round((clamped / 9) * 1000)
}

/** Learnix score (0–1000) → speaking grade 0–9 (half-band steps). */
export function learnixScoreToSpeakingBand(score: number): number {
  const clamped = Math.max(0, Math.min(1000, score))
  return Math.round((clamped / 1000) * 9 * 2) / 2
}

/** IELTS band (0–9) → Learnix score using the display inverse (band 4→0, 9→1000). */
export function ieltsBandToLearnixScore(band: number): number {
  const clamped = Math.max(0, Math.min(9, band))
  return Math.round(Math.max(0, Math.min(1000, ((clamped - 4) / 5) * 1000)))
}

export function learnixScoreFillPercent(score: number): number {
  return Math.max(0, Math.min(100, score / 10))
}

/** Learnix level metadata for teacher grading UI. */
export const LEARNIX_LEVEL_META = [
  { level: 1, cefr: "A1", title: "Starter" },
  { level: 2, cefr: "A2", title: "Elementary" },
  { level: 3, cefr: "A2", title: "Pre-Intermediate" },
  { level: 4, cefr: "B1", title: "Intermediate" },
  { level: 5, cefr: "B1", title: "Upper-Intermediate" },
  { level: 6, cefr: "B2", title: "B2 Core" },
  { level: 7, cefr: "B2", title: "B2 Advanced" },
  { level: 8, cefr: "C1", title: "C1" },
  { level: 9, cefr: "C2", title: "C2" },
] as const

export function ieltsBandFillPercent(band: number): number {
  return Math.max(0, Math.min(100, (band / 9) * 100))
}

/** Bar colour: red → yellow → green from fill % (green from 70%). */
export function skillBarFillColor(fillPercent: number): string {
  const p = Math.max(0, Math.min(100, fillPercent))
  if (p >= 70) return "#22c55e"
  if (p >= 40) return "#eab308"
  return "#ef4444"
}

export function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High"
  if (c >= 0.5) return "Medium"
  return "Low"
}

export function confidenceClass(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-800"
  if (c >= 0.5) return "bg-sky-100 text-sky-800"
  return "bg-amber-100 text-amber-800"
}

export type TopicSkill = "grammar" | "vocabulary" | "speaking" | "reading" | "listening"

export interface TopicWithSkill extends LanguageTopicStat {
  skill: TopicSkill
}

export function collectAllTopics(profile: StudentLanguageProfile): TopicWithSkill[] {
  const rows: TopicWithSkill[] = []
  for (const skill of ["grammar", "vocabulary", "speaking", "reading", "listening"] as const) {
    for (const topic of profile[skill]?.topics ?? []) {
      rows.push({ ...topic, skill })
    }
  }
  return rows
}

export function groupTopicsByLevel(topics: TopicWithSkill[]): Map<number, TopicWithSkill[]> {
  const map = new Map<number, TopicWithSkill[]>()
  for (const topic of topics) {
    const level = topic.learnixLevel ?? 5
    const list = map.get(level) ?? []
    list.push(topic)
    map.set(level, list)
  }
  for (const [, list] of map) {
    list.sort((a, b) => {
      if (a.mastered !== b.mastered) return a.mastered ? -1 : 1
      return (b.weightedAccuracy ?? 0) - (a.weightedAccuracy ?? 0)
    })
  }
  return map
}
