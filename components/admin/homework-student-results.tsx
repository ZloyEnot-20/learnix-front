"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Save,
  Target,
  XCircle,
} from "lucide-react"
import {
  getGroup,
  listStudents,
  listSubmissions,
  updateSubmission,
  type HomeworkAssignment,
  type HomeworkStatus,
  type HomeworkSubmission,
} from "@/lib/admin-storage"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const STATUS_META: Record<HomeworkStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
}

// Lower number = appears earlier. Completed first, not completed last.
const STATUS_RANK: Record<HomeworkStatus, number> = {
  graded: 0,
  submitted: 1,
  in_progress: 2,
  pending: 3,
}

interface Row {
  studentId: string
  studentName: string
  submission?: HomeworkSubmission
  status: HomeworkStatus
  feedback: string
  dirty: boolean
}

export function HomeworkStudentResults({
  homework,
  onChanged,
}: {
  homework: HomeworkAssignment
  onChanged?: () => void
}) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedRow = useMemo(
    () => rows.find((r) => r.studentId === selectedId) ?? null,
    [rows, selectedId],
  )

  useEffect(() => {
    const group = getGroup(homework.groupId)
    const allStudents = listStudents()
    const submissions = listSubmissions().filter((s) => s.homeworkId === homework.id)
    const memberIds = group?.studentIds ?? []

    const built: Row[] = memberIds
      .map((sid) => {
        const student = allStudents.find((s) => s.id === sid)
        if (!student) return null
        const sub = submissions.find((x) => x.studentId === sid)
        return {
          studentId: sid,
          studentName: student.name,
          submission: sub,
          status: (sub?.status ?? "pending") as HomeworkStatus,
          feedback: sub?.feedback ?? "",
          dirty: false,
        }
      })
      .filter(Boolean) as Row[]

    setRows(built)
    setSelectedId(null)
  }, [homework])

  // Completed students first, then in progress, then not started.
  const sortedRows = useMemo(() => {
    const dueAt = new Date(homework.dueAt).getTime()
    return [...rows].sort((a, b) => {
      const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status]
      if (rankDiff !== 0) return rankDiff
      const accA = accuracyOf(a.submission)
      const accB = accuracyOf(b.submission)
      if (accA !== accB) return accB - accA
      const subA = a.submission?.submittedAt ? new Date(a.submission.submittedAt).getTime() : dueAt
      const subB = b.submission?.submittedAt ? new Date(b.submission.submittedAt).getTime() : dueAt
      return subA - subB
    })
  }, [rows, homework.dueAt])

  const counts = useMemo(() => {
    const c = { done: 0, working: 0, pending: 0 }
    for (const r of rows) {
      if (r.status === "submitted" || r.status === "graded") c.done += 1
      else if (r.status === "in_progress") c.working += 1
      else c.pending += 1
    }
    return c
  }, [rows])

  const updateRow = (studentId: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...patch, dirty: true } : r)),
    )
  }

  const saveRow = (row: Row) => {
    if (!row.submission) {
      toast({
        title: "No submission record",
        description: "This student wasn't in the group when homework was created.",
        variant: "destructive",
      })
      return
    }
    updateSubmission(row.submission.id, {
      feedback: row.feedback.trim() || undefined,
    })
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === row.studentId
          ? {
              ...r,
              dirty: false,
              submission: r.submission
                ? { ...r.submission, feedback: r.feedback.trim() || undefined }
                : undefined,
            }
          : r,
      ),
    )
    toast({ title: "Saved", description: `${row.studentName} updated` })
    onChanged?.()
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No students in this group.
      </div>
    )
  }

  const dueAt = new Date(homework.dueAt).getTime()

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          {counts.done} completed
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
          <Clock className="h-3 w-3" />
          {counts.working} in progress
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
          <XCircle className="h-3 w-3" />
          {counts.pending} not started
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="py-3 px-3 font-semibold">Student</th>
              <th className="py-3 px-3 font-semibold">Status</th>
              <th className="py-3 px-3 font-semibold">Score</th>
              <th className="py-3 px-3 font-semibold">Correct</th>
              <th className="py-3 px-3 font-semibold">Submitted</th>
              <th className="py-3 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => {
              const sMeta = STATUS_META[row.status]
              const submittedAt = row.submission?.submittedAt
              const numericScore = row.submission?.score
              const lateBy =
                submittedAt && dueAt
                  ? Math.floor((new Date(submittedAt).getTime() - dueAt) / (24 * 60 * 60 * 1000))
                  : 0
              const attempt = row.submission?.attempt
              const accuracy =
                attempt && attempt.totalQuestions > 0
                  ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
                  : null
              const canExpand = !!attempt || row.status !== "pending"
              const isSelected = selectedId === row.studentId
              const rowBg = isSelected
                ? "bg-blue-50/60"
                : idx % 2 === 1
                  ? "bg-slate-100/70"
                  : "bg-white"
              return (
                  <tr
                    key={row.studentId}
                    onClick={() => canExpand && setSelectedId(row.studentId)}
                    className={cn(
                      "h-14 border-b border-slate-100 transition-colors",
                      rowBg,
                      canExpand && "cursor-pointer hover:bg-slate-200/60",
                    )}
                  >
                    <td className="py-3 px-3 font-medium text-slate-900">{row.studentName}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            sMeta.cls,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", sMeta.dot)} />
                          {sMeta.label}
                        </span>
                        {attempt?.timedOut && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                            <AlertTriangle className="h-3 w-3" />
                            Time
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {typeof numericScore === "number" && !Number.isNaN(numericScore) ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                            bandClass(numericScore),
                          )}
                        >
                          <Award className="h-3 w-3" />
                          {numericScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {attempt && accuracy != null ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="tabular-nums text-slate-700">
                            {attempt.correctCount}/{attempt.totalQuestions}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                              accuracyClass(accuracy),
                            )}
                          >
                            {accuracy}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {submittedAt ? (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xs">
                            {new Date(submittedAt).toLocaleDateString()}
                          </span>
                          {lateBy > 0 ? (
                            <span className="text-[11px] font-semibold text-rose-600">
                              {lateBy}d late
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-600">on time</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">Not submitted</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-400">
                      {canExpand && <ChevronRight className="h-4 w-4" />}
                    </td>
                  </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          {selectedRow && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      STATUS_META[selectedRow.status].cls,
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", STATUS_META[selectedRow.status].dot)}
                    />
                    {STATUS_META[selectedRow.status].label}
                  </span>
                  {selectedRow.submission?.startedAt && (
                    <span className="text-[11px] text-slate-500">
                      Started{" "}
                      {new Date(selectedRow.submission.startedAt).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                  {selectedRow.submission?.submittedAt && (
                    <span className="text-[11px] text-slate-500">
                      · Finished{" "}
                      {new Date(selectedRow.submission.submittedAt).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl mt-2 text-left">
                  {selectedRow.studentName}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="px-6 py-5">
                  <StudentDetail row={selectedRow} onFeedback={updateRow} onSave={saveRow} />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentDetail({
  row,
  onFeedback,
  onSave,
}: {
  row: Row
  onFeedback: (studentId: string, patch: Partial<Row>) => void
  onSave: (row: Row) => void
}) {
  const attempt = row.submission?.attempt
  const accuracy =
    attempt && attempt.totalQuestions > 0
      ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
      : null

  return (
    <div className="space-y-3">
      {attempt ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Exercise result
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-900 ring-1 ring-slate-200">
                {attempt.correctCount}/{attempt.totalQuestions} correct
              </span>
              {accuracy != null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                    accuracyClass(accuracy),
                  )}
                >
                  <Target className="h-3 w-3" />
                  {accuracy}% accuracy
                </span>
              )}
              {attempt.timedOut && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                  <AlertTriangle className="h-3 w-3" />
                  Failed — time ran out
                  {typeof attempt.answeredCount === "number" &&
                    ` (${attempt.answeredCount}/${attempt.totalQuestions} answered)`}
                </span>
              )}
            </div>
            {attempt.durationSeconds ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" />
                {formatDuration(attempt.durationSeconds)}
              </span>
            ) : null}
          </div>
          {accuracy != null && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  accuracy >= 80
                    ? "bg-emerald-500"
                    : accuracy >= 60
                      ? "bg-sky-500"
                      : accuracy >= 40
                        ? "bg-amber-500"
                        : "bg-rose-500",
                )}
                style={{ width: `${accuracy}%` }}
              />
            </div>
          )}
          {attempt.mistakes.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {attempt.mistakes.map((m) => (
                <li
                  key={`${row.studentId}-${m.questionId}`}
                  className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs"
                >
                  <p className="text-slate-700">
                    <span className="font-semibold text-slate-900">Q{m.questionId}.</span> {m.prompt}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <XCircle className="h-3 w-3" />
                      Answer: <span className="font-semibold">{m.userAnswer || "—"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Correct: <span className="font-semibold">{m.correctAnswer}</span>
                    </span>
                  </div>
                  {m.explanation && (
                    <p className="mt-1 text-[11px] italic text-slate-500">{m.explanation}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              All answers correct
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
          No detailed attempt recorded for this submission.
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-[11px] uppercase tracking-wider text-slate-500">Feedback</label>
          <Input
            value={row.feedback}
            onChange={(e) => onFeedback(row.studentId, { feedback: e.target.value })}
            placeholder="Optional notes for the student"
            className="mt-1"
          />
        </div>
        <Button
          size="sm"
          onClick={() => onSave(row)}
          disabled={!row.dirty}
          className={cn("bg-emerald-600 hover:bg-emerald-700", !row.dirty && "opacity-50")}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {row.dirty ? "Save" : "Saved"}
        </Button>
      </div>
    </div>
  )
}

function accuracyOf(sub?: HomeworkSubmission): number {
  const a = sub?.attempt
  if (!a || a.totalQuestions === 0) return -1
  return a.correctCount / a.totalQuestions
}

function bandClass(score: number): string {
  if (score >= 7) return "bg-emerald-100 text-emerald-800"
  if (score >= 5.5) return "bg-sky-100 text-sky-800"
  if (score >= 4) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function accuracyClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m < 60) return s > 0 && m < 10 ? `${m}m ${s}s` : `${m} min`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}
