/**
 * Client-side cache for the exercise catalogue (folders + exercises).
 *
 * Reads come from the backend API. Until the catalogue has been imported into
 * the database (via the "Sync to database" button), the API may return an empty
 * list — in that case we transparently fall back to the bundled local seed so
 * the exercises tab keeps working. Once data exists in the DB, it wins.
 */
import { exercisesApi } from "./api"
import { listGrammarExercises } from "./grammar-storage"
import type { GrammarExercise } from "./grammar-types"
import type { TopicMeta } from "./grammar-utils"
import topicsMetaRaw from "./grammar-topics-meta.json"

const LOCAL_TOPICS = topicsMetaRaw as TopicMeta[]
const TTL = 5 * 60 * 1000

interface CacheEntry<T> {
  data?: T
  fetchedAt?: number
  inflight?: Promise<T>
}

const exercisesCache: CacheEntry<GrammarExercise[]> = {}
const topicsCache: CacheEntry<TopicMeta[]> = {}

function isFresh<T>(entry: CacheEntry<T>): boolean {
  return (
    entry.data !== undefined &&
    entry.fetchedAt !== undefined &&
    Date.now() - entry.fetchedAt < TTL
  )
}

async function load<T>(
  cache: CacheEntry<T>,
  fetcher: () => Promise<T>,
  force: boolean,
): Promise<T> {
  if (!force && isFresh(cache)) return cache.data as T
  if (!force && cache.inflight) return cache.inflight

  const promise = fetcher()
    .then((data) => {
      cache.data = data
      cache.fetchedAt = Date.now()
      return data
    })
    .finally(() => {
      if (cache.inflight === promise) cache.inflight = undefined
    })

  cache.inflight = promise
  return promise
}

/** All exercises — from the DB, falling back to the local seed when empty. */
export const getExercises = (force = false): Promise<GrammarExercise[]> =>
  load(
    exercisesCache,
    async () => {
      try {
        const remote = await exercisesApi.list()
        if (remote.length > 0) return remote
      } catch {
        /* fall through to seed */
      }
      return listGrammarExercises()
    },
    force,
  )

/** All topic folders — from the DB, falling back to the local meta when empty. */
export const getTopicsMeta = (force = false): Promise<TopicMeta[]> =>
  load(
    topicsCache,
    async () => {
      try {
        const remote = await exercisesApi.topics()
        if (remote.length > 0) return remote
      } catch {
        /* fall through to seed */
      }
      return LOCAL_TOPICS
    },
    force,
  )

/** Synchronously read whatever is cached — for instant first render. */
export const peekExercises = (): GrammarExercise[] | undefined =>
  exercisesCache.data
export const peekTopicsMeta = (): TopicMeta[] | undefined => topicsCache.data

/** Resolve a single exercise by slug (DB first, then local seed). */
export async function getExerciseBySlug(
  slug: string,
): Promise<GrammarExercise | undefined> {
  const list = await getExercises()
  const found = list.find((e) => e.slug === slug || e.id === slug)
  if (found) return found
  // Last-resort local lookup (covers exercises not yet in the cache).
  return listGrammarExercises().find((e) => e.slug === slug || e.id === slug)
}

/**
 * Synchronously resolve an exercise by slug from the warm cache (or local seed).
 * Returns undefined only if the catalogue hasn't been loaded yet AND the slug
 * isn't in the bundled seed — in which case callers should fall back to the
 * async {@link getExerciseBySlug}.
 */
export function peekExerciseBySlug(slug: string): GrammarExercise | undefined {
  const cached = exercisesCache.data?.find(
    (e) => e.slug === slug || e.id === slug,
  )
  if (cached) return cached
  return listGrammarExercises().find((e) => e.slug === slug || e.id === slug)
}

export function invalidateExercises(): void {
  exercisesCache.data = undefined
  exercisesCache.fetchedAt = undefined
  topicsCache.data = undefined
  topicsCache.fetchedAt = undefined
}

/**
 * The bundled local catalogue (folders + exercises) used as the import payload
 * when syncing everything into the database.
 */
export function getLocalCatalog(): {
  exercises: GrammarExercise[]
  topics: TopicMeta[]
} {
  return { exercises: listGrammarExercises(), topics: LOCAL_TOPICS }
}
