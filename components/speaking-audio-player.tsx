"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Mic, Pause, Play, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

const PLAYBACK_UPDATE_INTERVAL_MS = 1000 / 60

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, "0")}`
}

export function SpeakingAudioPlayer({
  src,
  className,
}: {
  src: string
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    setPlaying(false)
    setLoading(true)
    setError(false)
    setCurrentTime(0)
    setDuration(0)

    const onLoaded = () => {
      setLoading(false)
      setDuration(audio.duration || 0)
    }
    const onEnded = () => {
      setCurrentTime(audio.currentTime)
      setPlaying(false)
    }
    const onError = () => {
      setLoading(false)
      setError(true)
      setPlaying(false)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => {
      setCurrentTime(audio.currentTime)
      setPlaying(false)
    }

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)
    audio.addEventListener("play", onPlay)
    audio.addEventListener("pause", onPause)

    return () => {
      audio.pause()
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
      audio.removeEventListener("play", onPlay)
      audio.removeEventListener("pause", onPause)
      audioRef.current = null
    }
  }, [src])

  useEffect(() => {
    if (!playing) return
    const audio = audioRef.current
    if (!audio) return

    let rafId = 0
    let lastUpdate = 0

    const tick = (timestamp: number) => {
      if (timestamp - lastUpdate >= PLAYBACK_UPDATE_INTERVAL_MS) {
        setCurrentTime(audio.currentTime)
        lastUpdate = timestamp
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [playing])

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || error) return
    if (playing) {
      audio.pause()
      return
    }
    try {
      await audio.play()
    } catch {
      setError(true)
      setPlaying(false)
    }
  }, [playing, error])

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      audio.currentTime = ratio * duration
      setCurrentTime(audio.currentTime)
    },
    [duration],
  )

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-sky-50/60 p-3 shadow-sm",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-200/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-sky-200/25 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={loading || error}
          aria-label={playing ? "Pause recording" : "Play recording"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-md transition-all",
            "bg-gradient-to-br from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700",
            "disabled:cursor-not-allowed disabled:opacity-50",
            playing && "ring-4 ring-sky-200/80",
          )}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <WaveformBars active={playing && !loading && !error} />
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700/80">
              <Mic className="h-3 w-3" />
              Recording
            </span>
          </div>

          <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
            onClick={seek}
            onKeyDown={(e) => {
              const audio = audioRef.current
              if (!audio || !duration) return
              if (e.key === "ArrowRight") {
                audio.currentTime = Math.min(duration, currentTime + 2)
                setCurrentTime(audio.currentTime)
              }
              if (e.key === "ArrowLeft") {
                audio.currentTime = Math.max(0, currentTime - 2)
                setCurrentTime(audio.currentTime)
              }
            }}
            className="group h-2 cursor-pointer rounded-full bg-sky-100/80"
          >
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600"
              style={{ width: `${progress}%` }}
            >
              <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-sky-600 opacity-0 shadow transition-opacity group-hover:opacity-100" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] tabular-nums text-slate-500">
            <span>{formatTime(currentTime)}</span>
            <span className="inline-flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              {error ? "Could not load audio" : formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WaveformBars({ active }: { active: boolean }) {
  const heights = [6, 12, 8, 14, 10, 16, 9, 13, 7, 11, 15, 8]

  return (
    <div className="flex h-4 items-end gap-[3px]" aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-sky-400/70 transition-all",
            active && "animate-speaking-bar",
          )}
          style={{
            height: active ? undefined : h,
            animationDelay: active ? `${i * 70}ms` : undefined,
            ...(active ? { ["--bar-base" as string]: `${h}px` } : {}),
          }}
        />
      ))}
    </div>
  )
}
