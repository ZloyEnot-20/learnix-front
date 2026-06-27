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

/** Initial empty catalogue; use fetchReadingSummaries for the real list. */
export function listReadings(): IeltsReadingSummary[] {
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

function enrichReadingSummaries(
  readings: IeltsReadingSummary[],
  typesBySlug: Map<string, string[]>,
): IeltsReadingSummary[] {
  return readings.map((reading) => ({
    ...reading,
    totalTimeMinutes: reading.totalTimeMinutes > 0 ? reading.totalTimeMinutes : 20,
    questionTypes: reading.questionTypes?.length
      ? reading.questionTypes
      : typesBySlug.get(reading.slug) ?? [],
  }))
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

  const typesBySlug = await fetchStaticReadingTypesBySlug()
  return enrichReadingSummaries(remote, typesBySlug)
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
