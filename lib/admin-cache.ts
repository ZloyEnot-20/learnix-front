/**
 * In-memory cache for admin reference data (students + groups).
 *
 * - Deduplicates concurrent requests (in-flight promise sharing).
 * - No sessionStorage — avoids stale names after backend updates.
 * - Short TTL only to collapse duplicate calls within the same navigation beat.
 * - Call invalidate*() after writes; AdminDataProvider listens and refetches.
 */
import { groupsApi, homeworkApi, paymentsApi, studentsApi } from "./api"
import type { Group, Student } from "./admin-storage"

/** Brief window to share one in-flight list request; not a long-lived stale cache. */
const TTL_MS = 5_000

type CacheKey = "students" | "groups" | "homework-count" | "all"

const CACHE_INVALIDATE = "admin-cache:invalidate"

interface CacheEntry<T> {
  data?: T
  fetchedAt?: number
  inflight?: Promise<T>
  /** Bumped on invalidate so stale in-flight responses cannot overwrite fresh data. */
  generation?: number
}

const studentsCache: CacheEntry<Student[]> = {}
const groupsCache: CacheEntry<Group[]> = {}
const homeworkCountCache: CacheEntry<number> = {}

function dispatchInvalidate(key: CacheKey): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(CACHE_INVALIDATE, { detail: { key } }))
}

/** Subscribe to cache invalidation (used by AdminDataProvider). */
export function onAdminCacheInvalidate(
  handler: (key: CacheKey) => void,
): () => void {
  if (typeof window === "undefined") return () => {}
  const listener = (e: Event) => {
    const key = (e as CustomEvent<{ key: CacheKey }>).detail?.key
    if (key) handler(key)
  }
  window.addEventListener(CACHE_INVALIDATE, listener)
  return () => window.removeEventListener(CACHE_INVALIDATE, listener)
}

function isFresh<T>(entry: CacheEntry<T>): boolean {
  return (
    entry.data !== undefined &&
    entry.fetchedAt !== undefined &&
    Date.now() - entry.fetchedAt < TTL_MS
  )
}

function bumpCacheGeneration<T>(cache: CacheEntry<T>): void {
  cache.generation = (cache.generation ?? 0) + 1
}

function invalidateCacheEntry<T>(cache: CacheEntry<T>): void {
  bumpCacheGeneration(cache)
  cache.data = undefined
  cache.fetchedAt = undefined
  cache.inflight = undefined
}

async function load<T>(
  cache: CacheEntry<T>,
  fetcher: () => Promise<T>,
  force: boolean,
): Promise<T> {
  if (!force && isFresh(cache)) return cache.data as T
  // Always share one in-flight request (avoids duplicate calls from Strict Mode / parallel effects).
  if (cache.inflight) return cache.inflight

  const generation = cache.generation ?? 0
  const promise = fetcher()
    .then((data) => {
      if ((cache.generation ?? 0) === generation) {
        cache.data = data
        cache.fetchedAt = Date.now()
      }
      return data
    })
    .finally(() => {
      if (cache.inflight === promise) cache.inflight = undefined
    })

  cache.inflight = promise
  return promise
}

/** Get students (pass force=true after edits or when opening a section). */
export const getStudents = (force = false) =>
  load(studentsCache, () => studentsApi.list(), force)

/** Always fetch the latest group list (schedule fields live on each group document). */
export const getGroups = (_force = false) =>
  load(groupsCache, () => groupsApi.list(), true)

export const getHomeworkCount = (force = false) =>
  load(homeworkCountCache, async () => (await homeworkApi.list()).length, force)

/** Last fetched list, if any — may be stale; prefer useAdminData(). */
export const peekStudents = (): Student[] | undefined => studentsCache.data
export const peekGroups = (): Group[] | undefined => groupsCache.data
export const peekHomeworkCount = (): number | undefined => homeworkCountCache.data

export function invalidateStudents(): void {
  invalidateCacheEntry(studentsCache)
  dispatchInvalidate("students")
}

export function invalidateGroups(): void {
  invalidateCacheEntry(groupsCache)
  invalidateCacheEntry(studentsCache)
  invalidateGroupSummaries()
  dispatchInvalidate("groups")
}

export function invalidateHomeworkCount(): void {
  invalidateCacheEntry(homeworkCountCache)
  dispatchInvalidate("homework-count")
}

export function invalidateAdminData(): void {
  invalidateCacheEntry(studentsCache)
  invalidateCacheEntry(groupsCache)
  invalidateCacheEntry(homeworkCountCache)
  invalidateGroupSummaries()
  dispatchInvalidate("all")
}

export function prefetchAdminData(): void {
  void getStudents(true)
  void getGroups(true)
}

// ---------- Group payment summaries (groups tab only) ----------
interface GroupSummary {
  expectedTotal: number
  paidTotal: number
  overdueTotal: number
  pendingTotal: number
}

const summariesCache: CacheEntry<Record<string, GroupSummary>> = {}

function summariesKey(groupIds: string[]): string {
  return [...groupIds].sort().join(",")
}

export async function getGroupSummaries(
  groupIds: string[],
  force = false,
): Promise<Record<string, GroupSummary>> {
  if (groupIds.length === 0) return {}

  const key = summariesKey(groupIds)
  const cachedKey = summariesCache.data ? summariesKey(Object.keys(summariesCache.data)) : ""
  if (!force && isFresh(summariesCache) && cachedKey === key) {
    return summariesCache.data as Record<string, GroupSummary>
  }
  if (!force && summariesCache.inflight) return summariesCache.inflight

  const promise = Promise.all(
    groupIds.map(async (id) => {
      try {
        const summary = await paymentsApi.groupSummary(id)
        return [id, summary] as const
      } catch {
        return [
          id,
          { expectedTotal: 0, paidTotal: 0, overdueTotal: 0, pendingTotal: 0 },
        ] as const
      }
    }),
  )
    .then((entries) => {
      const data = Object.fromEntries(entries) as Record<string, GroupSummary>
      summariesCache.data = data
      summariesCache.fetchedAt = Date.now()
      return data
    })
    .finally(() => {
      if (summariesCache.inflight === promise) summariesCache.inflight = undefined
    })

  summariesCache.inflight = promise
  return promise
}

export function invalidateGroupSummaries(): void {
  summariesCache.data = undefined
  summariesCache.fetchedAt = undefined
  summariesCache.inflight = undefined
}
