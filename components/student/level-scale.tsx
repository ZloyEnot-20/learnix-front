"use client"

import { useEffect, useState } from "react"
import { Lock, ChevronRight, Check } from "lucide-react"
import { TierIcon } from "@/components/tier-icon"
import { studentsApi } from "@/lib/api"
import {
  tierForLevel,
  TIERS,
  CEFR_LEVEL_REQUIREMENT,
  type StudentLevel,
} from "@/lib/gamification"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/** Modal that showcases every tier so each level feels like a prestige goal. */
function AllLevelsDialog({ currentLevel }: { currentLevel: number }) {
  const currentTier = tierForLevel(currentLevel)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
        >
          All levels
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>All levels</DialogTitle>
          <DialogDescription>
            Each tier is a new milestone. Earn points to unlock the next rank.
          </DialogDescription>
        </DialogHeader>
        <ol className="mt-2 space-y-3">
          {TIERS.map((tier) => {
            const isCurrent = tier.id === currentTier.id
            const isPassed = currentLevel > tier.maxLevel
            const range =
              tier.maxLevel === Number.POSITIVE_INFINITY
                ? `Lvl ${tier.minLevel}+`
                : `Lvl ${tier.minLevel}–${tier.maxLevel}`
            return (
              <li
                key={tier.id}
                className={cn(
                  "relative flex gap-3 rounded-2xl border p-3 transition-colors",
                  isCurrent
                    ? "border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200"
                    : "border-slate-200 bg-white",
                  !isCurrent && !isPassed && "opacity-90",
                )}
              >
                <TierIcon
                  tierId={tier.id}
                  size={56}
                  dimmed={!isCurrent && !isPassed}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{tier.label}</h4>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        tier.badge,
                      )}
                    >
                      {range}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        You are here
                      </span>
                    )}
                    {isPassed && (
                      <Check className="h-4 w-4 text-emerald-500" aria-label="Completed" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-700">{tier.tagline}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{tier.description}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {tier.perks.map((perk) => (
                      <li
                        key={perk}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ol>
      </DialogContent>
    </Dialog>
  )
}

interface LevelScaleProps {
  studentId: string
  /** Compact variant for headers (no CEFR unlock list). */
  compact?: boolean
  className?: string
}

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

export function LevelScale({ studentId, compact = false, className }: LevelScaleProps) {
  const [data, setData] = useState<StudentLevel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    studentsApi
      .level(studentId)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-4 animate-pulse",
          className,
        )}
      >
        <div className="h-5 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-200" />
      </div>
    )
  }

  if (!data) return null

  const tier = tierForLevel(data.level)
  const progressPct = Math.round(
    (data.pointsIntoLevel / data.pointsForNextLevel) * 100,
  )

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <TierIcon tierId={tier.id} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {data.levelName}
            </h3>
            <AllLevelsDialog currentLevel={data.level} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                tier.badge,
              )}
            >
              {data.tierLabel}
            </span>
            <p className="text-xs text-slate-500">
              {data.totalPoints.toLocaleString()} pts ·{" "}
              {data.pointsToNextLevel} pts to level {data.level + 1}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all", tier.bar)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {!compact && (
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Unlocked levels
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CEFR_ORDER.map((cefr) => {
              const required = CEFR_LEVEL_REQUIREMENT[cefr] ?? 1
              const unlocked = data.unlockedCefrLevels.includes(cefr)
              return (
                <span
                  key={cefr}
                  title={
                    unlocked ? `${cefr} unlocked` : `Reach level ${required} to unlock ${cefr}`
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    unlocked
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-400",
                  )}
                >
                  {!unlocked && <Lock className="h-3 w-3" />}
                  {cefr}
                  {!unlocked && <span className="font-normal">· Lvl {required}</span>}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
