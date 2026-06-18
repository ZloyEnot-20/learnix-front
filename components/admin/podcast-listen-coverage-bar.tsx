import { cn } from "@/lib/utils"
import {
  mergeListenedSegments,
  resolveListenedSegments,
  type PodcastListenedSegment,
} from "@/lib/podcast-listening"

function formatListenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function PodcastListenCoverageBar({
  durationSeconds,
  segments,
  totalListenSeconds,
  className,
}: {
  durationSeconds: number
  segments?: PodcastListenedSegment[]
  totalListenSeconds: number
  className?: string
}) {
  if (durationSeconds <= 0) return null

  const resolved = resolveListenedSegments({
    listenedSegments: segments,
    totalListenSeconds,
    podcastDurationSeconds: durationSeconds,
  })
  const merged = mergeListenedSegments(resolved)

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        {merged.map((segment, index) => {
          const left = (segment.startSeconds / durationSeconds) * 100
          const width = ((segment.endSeconds - segment.startSeconds) / durationSeconds) * 100
          return (
            <div
              key={`${segment.startSeconds}-${segment.endSeconds}-${index}`}
              className="absolute top-0 h-full rounded-full bg-emerald-500"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 0.35)}%`,
              }}
              title={`${formatListenDuration(segment.startSeconds)} – ${formatListenDuration(segment.endSeconds)}`}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Listened
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-200 ring-1 ring-slate-300" />
          Not heard
        </span>
      </div>
    </div>
  )
}
