"use client"

import { useMemo } from "react"
import { X } from "lucide-react"
import type { LiveStudentProgress } from "@/lib/books/types"
import { cn } from "@/lib/utils"

export type ResultsMetric = "completion" | "accuracy"

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

function sortValue(s: LiveStudentProgress, metric: ResultsMetric): number {
  if (metric === "completion") {
    if (s.status === "done") return 100
    return s.progress ?? 0
  }
  const pct = scorePercentValue(s)
  if (pct != null) return pct
  if (s.scoreDetail && s.scoreDetail.total > 0) {
    return (100 * s.scoreDetail.correct) / s.scoreDetail.total
  }
  return -1
}

function displayValue(s: LiveStudentProgress, metric: ResultsMetric): string {
  if (metric === "completion") {
    if (s.status === "done") return "100%"
    if (s.status === "working" && s.progress > 0) return `${s.progress}%`
    return "—"
  }
  const correct = s.scoreDetail?.correct
  const total = s.scoreDetail?.total
  if (correct != null && total != null && total > 0) return `${correct}/${total}`
  const pct = scorePercentValue(s)
  if (pct != null) return `${pct}%`
  return "—"
}

function splitColumns(students: LiveStudentProgress[]): [LiveStudentProgress[], LiveStudentProgress[]] {
  const mid = Math.ceil(students.length / 2)
  return [students.slice(0, mid), students.slice(mid)]
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

function StudentColumn({
  rows,
  metric,
  onStudentClick,
}: {
  rows: LiveStudentProgress[]
  metric: ResultsMetric
  onStudentClick: (s: LiveStudentProgress) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      {rows.map((s) => {
        const value = displayValue(s, metric)
        const numeric = sortValue(s, metric)
        return (
          <button
            key={s.studentId}
            type="button"
            onClick={() => onStudentClick(s)}
            className="flex items-baseline justify-between gap-2 rounded px-1.5 py-0.5 text-left transition hover:bg-slate-50"
          >
            <span className="min-w-0 truncate text-[11px] text-slate-700">{s.name}</span>
            <span
              className={cn(
                "shrink-0 text-[11px] font-semibold tabular-nums",
                numeric >= 80
                  ? "text-emerald-600"
                  : numeric >= 50
                    ? "text-amber-600"
                    : numeric >= 0
                      ? "text-slate-600"
                      : "text-slate-300",
              )}
            >
              {value}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function ExerciseResultsPopover({
  exerciseId,
  students,
  metric,
  onMetricChange,
  onStudentClick,
  onClose,
  className,
}: Props) {
  const sorted = useMemo(
    () => [...students].sort((a, b) => sortValue(b, metric) - sortValue(a, metric)),
    [students, metric],
  )
  const [colA, colB] = useMemo(() => splitColumns(sorted), [sorted])

  const summary = useMemo(() => {
    if (metric === "completion") {
      const done = students.filter((s) => s.status === "done").length
      const total = students.length
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return { value: `${pct}%`, label: `${done}/${total} done` }
    }
    const graded = students.filter((s) => s.scoreDetail && s.scoreDetail.total > 0)
    if (graded.length === 0) return { value: "—", label: "No scores yet" }
    const avgCorrect = Math.round(
      graded.reduce((sum, s) => sum + (s.scoreDetail?.correct ?? 0), 0) / graded.length,
    )
    const avgTotal = Math.round(
      graded.reduce((sum, s) => sum + (s.scoreDetail?.total ?? 0), 0) / graded.length,
    )
    const avg =
      graded.reduce((sum, s) => sum + (scorePercentValue(s) ?? 0), 0) / graded.length
    return {
      value: `${avgCorrect}/${avgTotal}`,
      label: `avg ${Math.round(avg)}%`,
    }
  }, [students, metric])

  return (
    <div className={cn("relative shrink-0", className)}>
      {/* Arrow pointing left toward the exercise */}
      <div
        className="absolute top-5 -left-[7px] z-10 h-0 w-0"
        style={{
          borderTop: "7px solid transparent",
          borderBottom: "7px solid transparent",
          borderRight: "7px solid rgb(226 232 240)",
        }}
      />
      <div
        className="absolute top-[21px] -left-[6px] z-10 h-0 w-0"
        style={{
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderRight: "6px solid white",
        }}
      />

      <div className="w-[220px] rounded-lg border border-slate-200 bg-white shadow-md">
        <div className="flex items-center justify-between border-b border-slate-100 px-2.5 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Ex {exerciseId}
            </p>
            <p className="text-lg font-bold tabular-nums leading-tight text-slate-900">
              {summary.value}
            </p>
            <p className="text-[10px] text-slate-500">{summary.label}</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-0.5 border-b border-slate-100 p-1">
          <button
            type="button"
            onClick={() => onMetricChange("completion")}
            className={cn(
              "flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition",
              metric === "completion"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            Done %
          </button>
          <button
            type="button"
            onClick={() => onMetricChange("accuracy")}
            className={cn(
              "flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition",
              metric === "accuracy"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50",
            )}
          >
            Score
          </button>
        </div>

        <div className="flex gap-1 px-1.5 py-2">
          <StudentColumn rows={colA} metric={metric} onStudentClick={onStudentClick} />
          <div className="w-px shrink-0 bg-slate-100" />
          <StudentColumn rows={colB} metric={metric} onStudentClick={onStudentClick} />
        </div>

        {students.length === 0 ? (
          <p className="px-2 pb-3 text-center text-[10px] text-slate-400">No students</p>
        ) : null}
      </div>
    </div>
  )
}
