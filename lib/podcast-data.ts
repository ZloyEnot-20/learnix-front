/**
 * Podcast episodes for listening practice and homework.
 * All data lives in the database — fetch via the API.
 */

export interface PodcastWord {
  word: string
  definition: string
}

export type PodcastDifficulty = "easy" | "medium" | "hard"

export interface PodcastEpisode {
  slug: string
  title: string
  /** Thematic topic, e.g. "Travel". */
  topic: string
  description: string
  level: string
  difficulty: PodcastDifficulty
  audioUrl: string
  durationMinutes: number
  /** Words shown after listening — optional. */
  words: PodcastWord[]
}

export function podcastHasWords(episode: PodcastEpisode): boolean {
  return episode.words.length > 0
}

/** @deprecated Use podcastHasWords */
export function podcastHasVocabulary(episode: PodcastEpisode): boolean {
  return podcastHasWords(episode)
}

/** Homework `exerciseSlug` payload for a podcast, e.g. "podcast:travel-tips". */
export const PODCAST_SLUG_PREFIX = "podcast:"

export function podcastHomeworkSlug(slug: string): string {
  return `${PODCAST_SLUG_PREFIX}${slug}`
}

export function parsePodcastHomeworkSlug(exerciseSlug: string | undefined): string | null {
  if (!exerciseSlug) return null
  return exerciseSlug.startsWith(PODCAST_SLUG_PREFIX)
    ? exerciseSlug.slice(PODCAST_SLUG_PREFIX.length)
    : null
}

export function isPodcastHomework(
  subject: string | undefined,
  exerciseSlug?: string | undefined,
): boolean {
  return subject === "listening" || parsePodcastHomeworkSlug(exerciseSlug) != null
}

/** Accent for podcast homework UI (emerald, matches mobile). */
export const PODCAST_SUBJECT_COLOR = "#10B981"

/** Synchronous placeholder — episodes come from the DB via fetchPodcasts(). */
export function listPodcasts(): PodcastEpisode[] {
  return []
}

export async function fetchPodcasts(): Promise<PodcastEpisode[]> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.podcasts()
  } catch {
    return []
  }
}

export async function fetchPodcast(slug: string): Promise<PodcastEpisode | undefined> {
  try {
    const { exercisesApi } = await import("./api")
    return await exercisesApi.podcast(slug)
  } catch {
    return undefined
  }
}

const PODCAST_INVALIDATE = "podcasts:invalidate"

export function invalidatePodcasts(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PODCAST_INVALIDATE))
}

export function onPodcastsInvalidate(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(PODCAST_INVALIDATE, handler)
  return () => window.removeEventListener(PODCAST_INVALIDATE, handler)
}
