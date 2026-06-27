/**
 * IELTS Reading tests for homework assignment.
 * Summaries are loaded from the API; an empty list is used until the request completes.
 */

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

import { collectAvailableReadingTypes } from "./reading-question-types"

/** Initial empty catalogue; use fetchReadingSummaries for the real list. */
export function listReadings(): IeltsReadingSummary[] {
  return []
}

async function fetchLocalReadingSummaries(): Promise<IeltsReadingSummary[]> {
  try {
    const res = await fetch("/api/local-readings")
    if (res.ok) return (await res.json()) as IeltsReadingSummary[]
  } catch {
    // ignore
  }
  return []
}

async function fetchStaticReadingTypesBySlug(): Promise<Map<string, string[]>> {
  try {
    const res = await fetch("/reading-types.json")
    if (!res.ok) return new Map()
    const bySlug = (await res.json()) as Record<string, string[]>
    return new Map(Object.entries(bySlug))
  } catch {
    return new Map()
  }
}

/** Fill missing questionTypes from a slug → types map. */
function mergeQuestionTypesFromMap(
  remote: IeltsReadingSummary[],
  typesBySlug: Map<string, string[]>,
): IeltsReadingSummary[] {
  if (typesBySlug.size === 0) return remote
  return remote.map((r) => {
    if (r.questionTypes?.length) return r
    const types = typesBySlug.get(r.slug)
    return types?.length ? { ...r, questionTypes: types } : r
  })
}

/** Fill missing questionTypes from local JSON catalogue (same slugs as API). */
function mergeReadingQuestionTypes(
  remote: IeltsReadingSummary[],
  local: IeltsReadingSummary[],
): IeltsReadingSummary[] {
  if (local.length === 0) return remote
  const localBySlug = new Map(local.map((r) => [r.slug, r.questionTypes ?? []]))
  return mergeQuestionTypesFromMap(remote, localBySlug)
}

export async function fetchReadingSummaries(): Promise<IeltsReadingSummary[]> {
  let remote: IeltsReadingSummary[] = []
  try {
    const { exercisesApi } = await import("./api")
    remote = await exercisesApi.readingSummaries()
  } catch {
    // fall back to local catalogue
  }

  const local = await fetchLocalReadingSummaries()
  if (remote.length === 0) return local

  if (collectAvailableReadingTypes(remote).length > 0) return remote

  let enriched = mergeReadingQuestionTypes(remote, local)
  if (collectAvailableReadingTypes(enriched).length === 0) {
    enriched = mergeQuestionTypesFromMap(enriched, await fetchStaticReadingTypesBySlug())
  }
  return enriched
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
