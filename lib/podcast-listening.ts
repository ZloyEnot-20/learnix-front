export interface PodcastListenedSegment {
  startSeconds: number
  endSeconds: number
}

export function mergeListenedSegments(
  segments: PodcastListenedSegment[],
): PodcastListenedSegment[] {
  if (segments.length === 0) return []

  const sorted = [...segments]
    .map((segment) => ({
      startSeconds: Math.max(0, segment.startSeconds),
      endSeconds: Math.max(0, segment.endSeconds),
    }))
    .filter((segment) => segment.endSeconds > segment.startSeconds)
    .sort((a, b) => a.startSeconds - b.startSeconds)

  if (sorted.length === 0) return []

  const merged: PodcastListenedSegment[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]
    if (current.startSeconds <= last.endSeconds + 0.75) {
      last.endSeconds = Math.max(last.endSeconds, current.endSeconds)
    } else {
      merged.push({ ...current })
    }
  }

  return merged
}

export function resolveListenedSegments(
  stats: {
    listenedSegments?: PodcastListenedSegment[]
    totalListenSeconds: number
    podcastDurationSeconds: number
  },
): PodcastListenedSegment[] {
  if (stats.listenedSegments?.length) {
    return mergeListenedSegments(stats.listenedSegments)
  }

  if (stats.podcastDurationSeconds <= 0 || stats.totalListenSeconds <= 0) {
    return []
  }

  return [
    {
      startSeconds: 0,
      endSeconds: Math.min(stats.totalListenSeconds, stats.podcastDurationSeconds),
    },
  ]
}

export function listenedCoveragePercent(
  segments: PodcastListenedSegment[],
  durationSeconds: number,
): number {
  if (durationSeconds <= 0) return 0
  const listened = mergeListenedSegments(segments).reduce(
    (sum, segment) => sum + (segment.endSeconds - segment.startSeconds),
    0,
  )
  return Math.min(100, Math.round((listened / durationSeconds) * 100))
}
