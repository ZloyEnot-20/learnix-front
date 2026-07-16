"use client"

import { useMemo } from "react"
import type { LiveExerciseResult, LiveLessonState, LiveStudentProgress } from "@/lib/books/types"
import { cn } from "@/lib/utils"

function scoreFromResult(r: LiveExerciseResult): number | null {
  if (r.scoreDetail && r.scoreDetail.total > 0) {
    return Math.round((100 * r.scoreDetail.correct) / r.scoreDetail.total)
  }
  if (r.score != null && Number.isFinite(r.score)) return Math.round(r.score)
  return null
}

type LessonStudentRow = LiveStudentProgress & {
  lessonAvg: number | null
  exerciseCount: number
}

function buildLessonRows(live: LiveLessonState): LessonStudentRow[] {
  const results = live.exerciseResults ?? []
  const byStudent = new Map<string, { scores: number[]; count: number }>()

  for (const r of results) {
    if (!byStudent.has(r.studentId)) {
      byStudent.set(r.studentId, { scores: [], count: 0 })
    }
    const row = byStudent.get(r.studentId)!
    row.count += 1
    const score = scoreFromResult(r)
    if (score != null) row.scores.push(score)
  }

  return (live.students ?? [])
    .map((s) => {
      const data = byStudent.get(s.studentId)
      const lessonAvg =
        data && data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : null
      return {
        ...s,
        lessonAvg,
        exerciseCount: data?.count ?? 0,
      }
    })
    .sort((a, b) => (b.lessonAvg ?? -1) - (a.lessonAvg ?? -1))
}

type Props = {
  live: LiveLessonState | null
  liveExerciseOpen?: boolean
  donePct?: number
  onStudentClick?: (s: LiveStudentProgress) => void
  className?: string
}

export function LessonStudentsPanel({
  live,
  liveExerciseOpen,
  donePct,
  onStudentClick,
  className,
}: Props) {
  const rows = useMemo(() => (live ? buildLessonRows(live) : []), [live])

  const classAvg = useMemo(() => {
    const scored = rows.filter((r) => r.lessonAvg != null)
    if (scored.length === 0) return null
    return Math.round(scored.reduce((sum, r) => sum + (r.lessonAvg ?? 0), 0) / scored.length)
  }, [rows])

  const totalExercises = useMemo(() => {
    const ids = new Set((live?.exerciseResults ?? []).map((r) => `${r.unitNumber}:${r.exerciseId}`))
    return ids.size
  }, [live?.exerciseResults])

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-slate-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lesson</p>
        {classAvg != null ? (
          <>
            <p className="text-xl font-bold tabular-nums text-slate-900">{classAvg}%</p>
            <p className="text-[10px] text-slate-500">
              {totalExercises} exercise{totalExercises !== 1 ? "s" : ""} · class avg
            </p>
          </>
        ) : liveExerciseOpen && donePct != null ? (
          <>
            <p className="text-xl font-bold tabular-nums text-emerald-700">{donePct}%</p>
            <p className="text-[10px] text-slate-500">Current exercise · done</p>
          </>
        ) : (
          <p className="text-xs text-slate-400">No results yet</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!live ? (
          <p className="px-1 text-xs text-slate-500">Prepare a lesson to track progress.</p>
        ) : rows.length === 0 ? (
          <p className="px-1 text-xs text-slate-500">No students in this group.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {rows.map((s) => {
              const isOnline =
                s.status === "online" || s.status === "working" || s.status === "done"
              const Tag = onStudentClick ? "button" : "div"
              return (
                <Tag
                  key={s.studentId}
                  type={onStudentClick ? "button" : undefined}
                  onClick={onStudentClick ? () => onStudentClick(s) : undefined}
                  className={cn(
                    "flex items-baseline justify-between gap-2 rounded-md px-2 py-1 text-left",
                    onStudentClick && "transition hover:bg-slate-50",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isOnline ? "bg-emerald-500" : "bg-slate-300",
                      )}
                    />
                    <span className="truncate text-[11px] text-slate-800">{s.name}</span>
                  </div>
                  {s.lessonAvg != null ? (
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-semibold tabular-nums",
                        s.lessonAvg >= 80
                          ? "text-emerald-600"
                          : s.lessonAvg >= 50
                            ? "text-amber-600"
                            : "text-slate-600",
                      )}
                    >
                      {s.lessonAvg}%
                      {s.exerciseCount > 1 ? (
                        <span className="ml-0.5 font-normal text-slate-400">·{s.exerciseCount}</span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-300">—</span>
                  )}
                </Tag>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
