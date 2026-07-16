"use client"

import { useMemo } from "react"
import { BarChart3, CheckCircle2, Users, X } from "lucide-react"
import type { LiveStudentProgress } from "@/lib/books/types"
import { cn } from "@/lib/utils"

export type ResultsMetric = "completion" | "accuracy"

function scoreBarColor(pct: number): string {
  const p = Math.min(100, Math.max(0, pct)) / 100
  const hue = p * 120
  return `hsl(${hue} 78% 42%)`
}

function scorePercentValue(s: {
  score?: number | null
  scoreDetail?: LiveStudentProgress["scoreDetail"] | null
}): number | null {
  if (s.scoreDetail && s.scoreDetail.total > 0) {
    return Math.round((100 * s.scoreDetail.correct) / s.scoreDetail.total)
  }
  if (s.score != null && Number.isFinite(s.score)) return Math.round(s.score)
  return null
}

function studentInitial(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name[0] ?? "?").toUpperCase()
}

type Props = {
  exerciseId: string
  students: LiveStudentProgress[]
  metric: ResultsMetric
  onMetricChange: (m: ResultsMetric) => void
  onStudentClick: (s: LiveStudentProgress) => void
  onClose?: () => void
  className?: string
}

export function ExerciseResultsPanel({
  exerciseId,
  students,
  metric,
  onMetricChange,
  onStudentClick,
  onClose,
  className,
}: Props) {
  const stats = useMemo(() => {
    const total = students.length
    const doneCount = students.filter((s) => s.status === "done").length
    const donePct = total > 0 ? Math.round((doneCount / total) * 100) : 0

    const graded = students.filter(
      (s) => s.scoreDetail && s.scoreDetail.total > 0,
    )
    const totalCorrect = graded.reduce((sum, s) => sum + (s.scoreDetail?.correct ?? 0), 0)
    const totalItems = graded.reduce((sum, s) => sum + (s.scoreDetail?.total ?? 0), 0)
    const avgPct =
      graded.length > 0
        ? Math.round(
            graded.reduce((sum, s) => sum + (scorePercentValue(s) ?? 0), 0) / graded.length,
          )
        : null

    return { total, doneCount, donePct, totalCorrect, totalItems, avgPct, gradedCount: graded.length }
  }, [students])

  const summaryValue =
    metric === "completion"
      ? `${stats.donePct}%`
      : stats.totalItems > 0
        ? `${stats.totalCorrect}/${stats.totalItems}`
        : "—"

  const summaryLabel =
    metric === "completion"
      ? `${stats.doneCount} of ${stats.total} completed`
      : stats.gradedCount > 0
        ? `avg ${stats.avgPct ?? "—"}% · ${stats.gradedCount} graded`
        : "No graded answers yet"

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-slate-100 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900">Results</p>
            <p className="truncate text-[10px] text-slate-500">Exercise {exerciseId}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close results"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {metric === "completion" ? "Completion" : "Correct answers"}
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
            {summaryValue}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{summaryLabel}</p>
          {metric === "completion" && stats.total > 0 ? (
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${stats.donePct}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2.5 flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => onMetricChange("completion")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition",
              metric === "completion"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <Users className="h-3 w-3" />
            Done %
          </button>
          <button
            type="button"
            onClick={() => onMetricChange("accuracy")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold transition",
              metric === "accuracy"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            Score
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {students.map((s) => {
            const isDone = s.status === "done"
            const scorePct = scorePercentValue(s)
            const correct = s.scoreDetail?.correct
            const total = s.scoreDetail?.total

            let displayValue: string
            let barPct = 0
            let barColor = "transparent"

            if (metric === "completion") {
              displayValue = isDone ? "✓" : s.status === "working" ? "…" : "—"
              barPct = isDone ? 100 : s.progress ?? 0
              barColor = isDone ? "#10b981" : "#94a3b8"
            } else {
              if (correct != null && total != null && total > 0) {
                displayValue = `${correct}/${total}`
                barPct = Math.round((correct / total) * 100)
                barColor = scoreBarColor(barPct)
              } else if (scorePct != null) {
                displayValue = `${scorePct}%`
                barPct = scorePct
                barColor = scoreBarColor(scorePct)
              } else {
                displayValue = "—"
              }
            }

            return (
              <button
                key={s.studentId}
                type="button"
                onClick={() => onStudentClick(s)}
                className={cn(
                  "group rounded-lg border px-2 py-2 text-left transition hover:shadow-sm",
                  isDone
                    ? "border-emerald-100 bg-emerald-50/50 hover:border-emerald-200"
                    : "border-slate-100 bg-white hover:border-slate-200",
                )}
              >
                <div className="flex items-start gap-1.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                      isDone
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {studentInitial(s.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium leading-tight text-slate-900">
                      {s.name.split(" ")[0]}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] font-bold tabular-nums leading-none",
                        metric === "accuracy" && barPct >= 70
                          ? "text-emerald-700"
                          : metric === "accuracy" && barPct > 0 && barPct < 70
                            ? "text-amber-700"
                            : "text-slate-700",
                      )}
                    >
                      {displayValue}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </button>
            )
          })}
        </div>
        {students.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-slate-500">No students in this group.</p>
        ) : null}
      </div>
    </div>
  )
}
