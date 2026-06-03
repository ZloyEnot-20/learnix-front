/**
 * Client-side cache for the signed-in student's homework (`/homework/mine`).
 *
 * Loaded once when the homework section opens so that opening an individual
 * assignment is instant: the exercise runner reads the assignment (and its
 * time limit) synchronously from here instead of issuing another request.
 */
import { homeworkApi } from "./api"
import type { StudentHomeworkEntry } from "./admin-storage"

const TTL = 5 * 60 * 1000

interface CacheEntry<T> {
  data?: T
  fetchedAt?: number
  inflight?: Promise<T>
}

const mineCache: CacheEntry<StudentHomeworkEntry[]> = {}

function isFresh(): boolean {
  return (
    mineCache.data !== undefined &&
    mineCache.fetchedAt !== undefined &&
    Date.now() - mineCache.fetchedAt < TTL
  )
}

/** The student's homework entries (fetches once, then reuses). */
export function getMyHomework(force = false): Promise<StudentHomeworkEntry[]> {
  if (!force && isFresh()) return Promise.resolve(mineCache.data!)
  if (!force && mineCache.inflight) return mineCache.inflight

  const promise = homeworkApi
    .mine()
    .then((data) => {
      mineCache.data = data
      mineCache.fetchedAt = Date.now()
      return data
    })
    .finally(() => {
      if (mineCache.inflight === promise) mineCache.inflight = undefined
    })

  mineCache.inflight = promise
  return promise
}

/** Synchronously read cached entries (undefined if not loaded yet). */
export const peekMyHomework = (): StudentHomeworkEntry[] | undefined =>
  mineCache.data

/** Synchronously read a single assignment from the cache by homework id. */
export function peekHomeworkById(
  homeworkId: string,
): StudentHomeworkEntry["homework"] | undefined {
  return mineCache.data?.find((e) => e.homework.id === homeworkId)?.homework
}

export function invalidateMyHomework(): void {
  mineCache.data = undefined
  mineCache.fetchedAt = undefined
}
