/**
 * IELTS Reading tests for homework assignment.
 * Summaries are loaded from the API; an empty list is used until the request completes.
 */

import readingTypesBySlug from "@/public/reading-types.json"
import { sortReadingQuestionTypes } from "@/lib/reading-question-types"

export interface IeltsReadingSummary {
  slug: string
  title: string
  subtitle: string
  totalTimeMinutes: number
  questionCount: number
  questionTypes?: string[]
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

/** Initial empty catalogue; use fetchReadingSummaries for the real list. */
export function listReadings(): IeltsReadingSummary[] {
  return []
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
    return []
  }

  if (remote.length === 0) return []

  return enrichReadingSummaries(remote)
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
