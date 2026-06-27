/**
 * IELTS Reading tests for homework assignment.
 * Summaries fall back to the local exercises catalogue when the API is empty.
 */

import readingIndex from "../../exercises/ielts/reading/index.json"

export interface IeltsReadingSummary {
  slug: string
  title: string
  subtitle: string
  totalTimeMinutes: number
  questionCount: number
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

interface ReadingCatalogItem {
  id: string
  title: string
  subtitle: string
  estimatedMinutes: number
  questionCount: number
  file: string
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

function localReadingSummaries(): IeltsReadingSummary[] {
  const items = (readingIndex as { items: ReadingCatalogItem[] }).items ?? []
  return items.map((item, order) => ({
    slug: item.id,
    title: item.title,
    subtitle: item.subtitle,
    totalTimeMinutes: item.estimatedMinutes,
    questionCount: item.questionCount,
    order,
  }))
}

/** Synchronous catalogue from bundled index.json. */
export function listReadings(): IeltsReadingSummary[] {
  return localReadingSummaries()
}

export async function fetchReadingSummaries(): Promise<IeltsReadingSummary[]> {
  try {
    const { exercisesApi } = await import("./api")
    const remote = await exercisesApi.readingSummaries()
    if (remote.length > 0) return remote
  } catch {
    // fall back to bundled catalogue
  }
  return localReadingSummaries()
}

export async function fetchReading(slug: string): Promise<IeltsReadingDocument | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    const doc = await exercisesApi.reading(slug)
    if (doc) return doc
  } catch {
    // fall back to local file
  }

  try {
    const res = await fetch(`/api/local-readings/${encodeURIComponent(slug)}`)
    if (res.ok) return (await res.json()) as IeltsReadingDocument
  } catch {
    // ignore
  }
  return undefined
}
