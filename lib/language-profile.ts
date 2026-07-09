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

export type TopicSkill = "grammar" | "vocabulary" | "speaking"

export interface TopicWithSkill extends LanguageTopicStat {
  skill: TopicSkill
}

export function collectAllTopics(profile: StudentLanguageProfile): TopicWithSkill[] {
  const rows: TopicWithSkill[] = []
  for (const skill of ["grammar", "vocabulary", "speaking"] as const) {
    for (const topic of profile[skill].topics ?? []) {
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
