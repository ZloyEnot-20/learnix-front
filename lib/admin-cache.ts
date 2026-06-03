/**
 * Client-side cache for admin reference data (students + groups).
 *
 * Goals:
 * - Load once per admin session: the first admin screen warms the cache and
 *   every later section switch reads from it — no repeat network requests.
 * - Survive component remounts / route changes (and dev Fast Refresh) by also
 *   persisting to `sessionStorage`, so an in-memory miss never re-hits the API
 *   within the same browser tab session.
 * - Deduplicate concurrent requests (in-flight promise sharing).
 * - Explicit invalidation after writes refetches fresh data.
 */
import { groupsApi, homeworkApi, paymentsApi, studentsApi } from "./api"
import type { Group, Student } from "./admin-storage"

// Effectively session-long. Data only changes via admin writes, which call the
// matching invalidate*() helper, so we don't need a short staleness window.
const TTL = 60 * 60 * 1000 // 1 hour

interface CacheEntry<T> {
  data?: T
  fetchedAt?: number
  inflight?: Promise<T>
  ssKey: string
}

const studentsCache: CacheEntry<Student[]> = { ssKey: "admin-cache:students" }
const groupsCache: CacheEntry<Group[]> = { ssKey: "admin-cache:groups" }
const homeworkCountCache: CacheEntry<number> = { ssKey: "admin-cache:homework-count" }

interface Persisted<T> {
  data: T
  fetchedAt: number
}

function readSession<T>(key: string): Persisted<T> | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as Persisted<T>
    if (parsed && parsed.data !== undefined && typeof parsed.fetchedAt === "number") {
      return parsed
    }
  } catch {
    /* ignore parse / access errors */
  }
  return undefined
}

function writeSession<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ data, fetchedAt: Date.now() } satisfies Persisted<T>),
    )
  } catch {
    /* ignore quota / access errors */
  }
}

function clearSession(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/** Pull persisted data into memory when the in-memory slot is empty. */
function hydrate<T>(entry: CacheEntry<T>): void {
  if (entry.data !== undefined) return
  const persisted = readSession<T>(entry.ssKey)
  if (persisted) {
    entry.data = persisted.data
    entry.fetchedAt = persisted.fetchedAt
  }
}

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
  if (!force) hydrate(cache)
  if (!force && isFresh(cache)) return cache.data as T
  // Share an in-flight request so simultaneous callers don't each fetch.
  if (!force && cache.inflight) return cache.inflight

  const promise = fetcher()
    .then((data) => {
      cache.data = data
      cache.fetchedAt = Date.now()
      writeSession(cache.ssKey, data)
      return data
    })
    .finally(() => {
      if (cache.inflight === promise) cache.inflight = undefined
    })

  cache.inflight = promise
  return promise
}

/** Get students from cache (fetches once, then reuses). Pass force to refetch. */
export const getStudents = (force = false) =>
  load(studentsCache, () => studentsApi.list(), force)

/** Get groups from cache (fetches once, then reuses). Pass force to refetch. */
export const getGroups = (force = false) =>
  load(groupsCache, () => groupsApi.list(), force)

/** Homework count for the nav badge (fetches once, then reuses). */
export const getHomeworkCount = (force = false) =>
  load(homeworkCountCache, async () => (await homeworkApi.list()).length, force)

/** Synchronously read whatever is cached (or undefined) — for instant render. */
export const peekStudents = (): Student[] | undefined => {
  hydrate(studentsCache)
  return studentsCache.data
}
export const peekGroups = (): Group[] | undefined => {
  hydrate(groupsCache)
  return groupsCache.data
}
export const peekHomeworkCount = (): number | undefined => {
  hydrate(homeworkCountCache)
  return homeworkCountCache.data
}

export function invalidateStudents(): void {
  studentsCache.data = undefined
  studentsCache.fetchedAt = undefined
  clearSession(studentsCache.ssKey)
}
export function invalidateGroups(): void {
  groupsCache.data = undefined
  groupsCache.fetchedAt = undefined
  clearSession(groupsCache.ssKey)
  invalidateGroupSummaries()
}
export function invalidateHomeworkCount(): void {
  homeworkCountCache.data = undefined
  homeworkCountCache.fetchedAt = undefined
  clearSession(homeworkCountCache.ssKey)
}
export function invalidateAdminData(): void {
  invalidateStudents()
  invalidateGroups()
  invalidateHomeworkCount()
}

/** Warm the cache on first admin load. Safe to call repeatedly (deduped). */
export function prefetchAdminData(): void {
  void getStudents()
  void getGroups()
}

// ---------- Group payment summaries (groups tab only) ----------
interface GroupSummary {
  expectedTotal: number
  paidTotal: number
  overdueTotal: number
  pendingTotal: number
}

const summariesCache: CacheEntry<Record<string, GroupSummary>> = {
  ssKey: "admin-cache:group-summaries",
}

function summariesKey(groupIds: string[]): string {
  return [...groupIds].sort().join(",")
}

/** Payment summaries per group — cached for the session, keyed by group id set. */
export async function getGroupSummaries(
  groupIds: string[],
  force = false,
): Promise<Record<string, GroupSummary>> {
  if (groupIds.length === 0) return {}

  const key = summariesKey(groupIds)
  if (!force) hydrate(summariesCache)
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
  ).then((entries) => {
    const data = Object.fromEntries(entries) as Record<string, GroupSummary>
    summariesCache.data = data
    summariesCache.fetchedAt = Date.now()
    writeSession(summariesCache.ssKey, data)
    return data
  }).finally(() => {
    if (summariesCache.inflight === promise) summariesCache.inflight = undefined
  })

  summariesCache.inflight = promise
  return promise
}

export function invalidateGroupSummaries(): void {
  summariesCache.data = undefined
  summariesCache.fetchedAt = undefined
  clearSession(summariesCache.ssKey)
}
