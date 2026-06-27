/**
 * IELTS Reading tests for homework assignment.
 * Full test payloads are loaded from the database via the API.
 */

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

/** Synchronous placeholder — tests come from the DB via fetchReadings(). */
export function listReadings(): IeltsReadingSummary[] {
  return []
}

export async function fetchReadingSummaries(): Promise<IeltsReadingSummary[]> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.readingSummaries()
  } catch {
    return []
  }
}

export async function fetchReading(slug: string): Promise<IeltsReadingDocument | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.reading(slug)
  } catch {
    return undefined
  }
}
