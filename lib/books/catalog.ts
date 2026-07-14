import type { BookDocument, BookUnitRaw } from "./types"
import { flattenUnitToSteps, unitIsReady } from "./lesson-flow"
import { resolveBookAudioUrl } from "./repair-listening-audio"
import { liveLessonsApi, type LiveBookSummary } from "@/lib/live-lessons-api"

export const BOOK_ID_CAMBRIDGE_VOCAB_ADVANCED = "cambridge-vocab-ielts-advanced"

type CacheEntry<T> = { at: number; value: T }
const TTL_MS = 5 * 60 * 1000

const bookMetaCache: { current: CacheEntry<LiveBookSummary[]> | null } = { current: null }
const bookDocCache = new Map<string, CacheEntry<BookDocument>>()
const unitCache = new Map<
  string,
  CacheEntry<{
    unit: BookUnitRaw
    answer_key: Record<string, unknown> | null
    audio_urls: Record<string, string> | null
  }>
>()

function fresh<T>(entry: CacheEntry<T> | null | undefined): T | null {
  if (!entry) return null
  if (Date.now() - entry.at > TTL_MS) return null
  return entry.value
}

/** Platform books from DB (all tenants). */
export async function fetchAvailableBooks(): Promise<LiveBookSummary[]> {
  const hit = fresh(bookMetaCache.current)
  if (hit) return hit
  const books = await liveLessonsApi.listBooks()
  bookMetaCache.current = { at: Date.now(), value: books }
  return books
}

export async function fetchBookDocument(bookId: string): Promise<BookDocument> {
  const hit = fresh(bookDocCache.get(bookId))
  if (hit) return hit

  const meta = await liveLessonsApi.getBook(bookId)
  // Unit list without full sections — load units on demand
  const doc: BookDocument = {
    book: (meta as { book?: BookDocument["book"] }).book ?? {
      title: bookId,
      author: "",
    },
    units: ((meta as { units?: BookUnitRaw[] }).units ?? []).map((u) => ({
      unit_number: u.unit_number,
      title: u.title,
      subtitle: u.subtitle,
      sections: u.sections ?? [],
    })),
    answer_key: (meta as { answer_key?: BookDocument["answer_key"] }).answer_key,
  }
  bookDocCache.set(bookId, { at: Date.now(), value: doc })
  return doc
}

export async function fetchBookUnit(bookId: string, unitNumber: number) {
  const key = `${bookId}:${unitNumber}`
  const hit = fresh(unitCache.get(key))
  const blob = hit ? JSON.stringify(hit) : ""
  if (hit && !/\?\?/.test(blob)) return hit
  if (hit) unitCache.delete(key)

  const result = await liveLessonsApi.getUnit(bookId, unitNumber)
  const value = {
    unit: result.unit as BookUnitRaw,
    answer_key: (result.answer_key as Record<string, unknown> | null) ?? null,
    audio_urls:
      result.audio_urls && typeof result.audio_urls === "object"
        ? result.audio_urls
        : null,
  }
  // Never cache broken markers
  if (!/\?\?/.test(JSON.stringify(value))) {
    unitCache.set(key, { at: Date.now(), value })
  }
  return value
}

/** Drop client book/unit caches (e.g. after seed / audio repair). */
export function clearBookCaches() {
  bookMetaCache.current = null
  bookDocCache.clear()
  unitCache.clear()
}

export async function fetchLessonSteps(bookId: string, unitNumber: number) {
  const { unit, answer_key, audio_urls } = await fetchBookUnit(bookId, unitNumber)
  const steps = flattenUnitToSteps(unit, answer_key ?? undefined)
  if (!audio_urls) return steps
  return steps.map((step) => {
    const track = step.raw.audio_track ?? step.raw.audio
    const audio_url = resolveBookAudioUrl(track, audio_urls)
    if (!audio_url) return step
    return { ...step, raw: { ...step.raw, audio_url } }
  })
}

export function listUnitsFromMeta(
  units: Array<{
    unit_number: number
    title: string
    subtitle?: string | null
    ready?: boolean
    exerciseIds?: string[]
    pages?: Array<{ page: number; label: string; exercise_ids?: string[] }>
  }>,
) {
  return units.map((u) => {
    const stepCount = u.exerciseIds?.length ?? 0
    const ready =
      typeof u.ready === "boolean"
        ? u.ready
        : stepCount > 0 || unitIsReady(u as BookUnitRaw)
    return {
      unitNumber: u.unit_number,
      title: u.title,
      subtitle: u.subtitle ?? undefined,
      ready,
      stepCount,
      pages: (u.pages ?? []).map((p) => ({
        page: p.page,
        label: p.label,
        exercise_ids: (p.exercise_ids ?? []) as string[],
      })),
    }
  })
}
