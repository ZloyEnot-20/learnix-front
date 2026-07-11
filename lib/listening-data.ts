/**
 * IELTS Listening tests for homework assignment and exercise catalogue.
 */

export interface IeltsListeningSummary {
  slug: string
  title: string
  subtitle: string
  book?: number
  test?: number
  totalTimeMinutes: number
  questionCount: number
  questionTypes?: string[]
  order?: number
}

export interface IeltsListeningDocument {
  slug: string
  title: string
  book?: number
  test?: number
  totalTimeMinutes: number
  questionCount: number
  fullAudioUrl: string
  data: {
    testId: string
    title: string
    book?: number
    test?: number
    catalogId?: string
    totalTime: number
    fullAudioUrl: string
    parts: unknown[]
    questionDetails?: unknown[]
    transcripts?: Record<string, string>
  }
}

/** Homework `exerciseSlug` payload, e.g. "ielts-listening:cambridge-ielts-9-listening-test-4". */
export const LISTENING_SLUG_PREFIX = "ielts-listening:"

export function listeningHomeworkSlug(slug: string): string {
  return `${LISTENING_SLUG_PREFIX}${slug}`
}

export function parseListeningHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(LISTENING_SLUG_PREFIX)
    ? exerciseSlug.slice(LISTENING_SLUG_PREFIX.length)
    : null
}

export function isIeltsListeningHomework(
  subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  return parseListeningHomeworkSlug(exerciseSlug) != null
}

export function listListenings(): IeltsListeningSummary[] {
  return []
}

export async function fetchListeningSummaries(): Promise<IeltsListeningSummary[]> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.listeningSummaries()
  } catch {
    return []
  }
}

export async function fetchListening(slug: string): Promise<IeltsListeningDocument | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    const doc = await exercisesApi.listening(slug)
    if (!doc) return undefined
    const totalTimeMinutes = doc.totalTimeMinutes > 0 ? doc.totalTimeMinutes : 30
    return {
      ...doc,
      totalTimeMinutes,
      data: {
        ...doc.data,
        totalTime: doc.data.totalTime > 0 ? doc.data.totalTime : totalTimeMinutes,
      },
    }
  } catch {
    return undefined
  }
}
