/**
 * IELTS Reading tests for homework assignment.
 * Summaries are loaded from the API; an empty list is used until the request completes.
 */

import readingTypesBySlug from "@/public/reading-types.json"
import cefrReadingIndex from "@/lib/data/cefr-reading-index.json"
import { sortReadingQuestionTypes } from "@/lib/reading-question-types"

export interface IeltsReadingSummary {
  slug: string
  title: string
  subtitle: string
  totalTimeMinutes: number
  questionCount: number
  questionTypes?: string[]
  /** CEFR band for level-based reading; empty = IELTS catalogue. */
  level?: string
  order?: number
}

export interface IeltsReadingPart {
  partNumber: number
  title: string
  instruction: string
  passageTitle?: string
  questionInstruction?: string
  passage: string
  totalQuestions: number
  sections?: {
    id: string
    title: string
    instruction: string
    startQuestion: number
    endQuestion: number
    questions: IeltsReadingPart["questions"]
  }[]
  questions: {
    id: number
    type: string
    question: string
    options?: string[]
    correctAnswer: string | number | string[]
  }[]
}

export interface IeltsReadingDocument {
  slug: string
  title: string
  totalTimeMinutes: number
  questionCount: number
  data: {
    id: string
    title: string
    totalTimeMinutes: number
    parts: IeltsReadingPart[]
  }
}

type CefrReadingIndexItem = {
  id: string
  title: string
  subtitle?: string
  level?: string
  estimatedMinutes?: number
  questionCount?: number
}

const STATIC_CEFR_READINGS: IeltsReadingSummary[] = (
  (cefrReadingIndex as { items?: CefrReadingIndexItem[] }).items ?? []
).map((item, idx) => ({
  slug: item.id,
  title: item.title,
  subtitle: item.subtitle ?? "",
  totalTimeMinutes: item.estimatedMinutes ?? 15,
  questionCount: item.questionCount ?? 0,
  level: item.level ?? "",
  order: 1000 + idx,
}))

/** Resolve CEFR band from API field or slug prefix (a1-reading-test-1 → A1). */
export function resolveReadingLevel(
  reading: Pick<IeltsReadingSummary, "slug" | "level">,
): string {
  const explicit = String(reading.level ?? "").trim()
  if (explicit) return explicit
  const match = reading.slug.match(/^(a1|a2|b1|b2|c1|c2)-reading-test-/i)
  return match ? match[1].toUpperCase() : ""
}

function withResolvedLevel(reading: IeltsReadingSummary): IeltsReadingSummary {
  const level = resolveReadingLevel(reading)
  return level ? { ...reading, level } : { ...reading, level: undefined }
}

function mergeReadingCatalog(remote: IeltsReadingSummary[]): IeltsReadingSummary[] {
  const bySlug = new Map<string, IeltsReadingSummary>()
  for (const item of STATIC_CEFR_READINGS) {
    bySlug.set(item.slug, item)
  }
  for (const item of remote.map(withResolvedLevel)) {
    const prev = bySlug.get(item.slug)
    bySlug.set(item.slug, {
      ...(prev ?? {}),
      ...item,
      level: resolveReadingLevel({ slug: item.slug, level: item.level ?? prev?.level }) || prev?.level,
    })
  }
  return [...bySlug.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
}

/** Homework `exerciseSlug` payload for reading, e.g. "reading:1518-australian-artist-margaret-preston". */
export const READING_SLUG_PREFIX = "reading:"

export function readingHomeworkSlug(slug: string): string {
  return `${READING_SLUG_PREFIX}${slug}`
}

export function parseReadingHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(READING_SLUG_PREFIX)
    ? exerciseSlug.slice(READING_SLUG_PREFIX.length)
    : null
}

export function isReadingHomework(
  subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  return subject === "reading" || parseReadingHomeworkSlug(exerciseSlug) != null
}

/** CEFR catalogue from repo JSON; merged with API in fetchReadingSummaries. */
export function listReadings(): IeltsReadingSummary[] {
  return enrichReadingSummaries(mergeReadingCatalog([]))
}

export function isIeltsReading(reading: Pick<IeltsReadingSummary, "slug" | "level">): boolean {
  return !resolveReadingLevel(reading)
}

export function filterIeltsReadings(readings: IeltsReadingSummary[]): IeltsReadingSummary[] {
  return readings.filter(isIeltsReading)
}

export function filterCefrReadingsByLevel(
  readings: IeltsReadingSummary[],
  level: string,
): IeltsReadingSummary[] {
  return readings.filter((r) => resolveReadingLevel(r) === level)
}

const STATIC_TYPES_BY_SLUG = new Map<string, string[]>(
  Object.entries(readingTypesBySlug as Record<string, string[]>),
)

function enrichReadingSummaries(readings: IeltsReadingSummary[]): IeltsReadingSummary[] {
  return readings.map((reading) => {
    const fromStatic = STATIC_TYPES_BY_SLUG.get(reading.slug) ?? []
    // Prefer the generated catalogue: remote API may still serve legacy/coarse types
    // until the backend is redeployed with the new classifier.
    const questionTypes =
      fromStatic.length > 0
        ? sortReadingQuestionTypes(fromStatic)
        : sortReadingQuestionTypes(reading.questionTypes ?? [])
    return {
      ...reading,
      totalTimeMinutes: reading.totalTimeMinutes > 0 ? reading.totalTimeMinutes : 20,
      questionTypes,
    }
  })
}

export async function fetchReadingSummaries(): Promise<IeltsReadingSummary[]> {
  let remote: IeltsReadingSummary[] = []
  try {
    const { exercisesApi } = await import("./api")
    remote = await exercisesApi.readingSummaries()
  } catch {
    remote = []
  }

  return enrichReadingSummaries(mergeReadingCatalog(remote))
}

export async function fetchReading(slug: string): Promise<IeltsReadingDocument | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    const doc = await exercisesApi.reading(slug)
    if (doc) {
      const totalTimeMinutes = doc.totalTimeMinutes > 0 ? doc.totalTimeMinutes : 20
      const dataTotal =
        doc.data.totalTimeMinutes > 0 ? doc.data.totalTimeMinutes : totalTimeMinutes
      return {
        ...doc,
        totalTimeMinutes,
        data: {
          ...doc.data,
          totalTimeMinutes: dataTotal,
          parts: doc.data.parts as IeltsReadingPart[],
        },
      }
    }
  } catch {
    // ignore
  }
  return undefined
}
