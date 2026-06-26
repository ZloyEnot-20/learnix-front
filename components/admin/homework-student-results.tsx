"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  RefreshCw,
  RotateCcw,
  Save,
  Target,
  XCircle,
} from "lucide-react"
import type {
  Group,
  HomeworkAssignment,
  HomeworkStatus,
  HomeworkSubmission,
  Student,
} from "@/lib/admin-storage"
import { homeworkApi } from "@/lib/api"
import {
  daysPastDue,
  endOfDueDay,
  isDuePassed,
} from "@/lib/homework-dates"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  buildHomeworkStudentRows,
  hasSubmissionResults,
  type HomeworkStudentRow,
} from "@/lib/build-homework-student-rows"
import {
  SpeakingRecordingReviewCard,
  recordingGradesFromMistakes,
  type RecordingGradeDraft,
} from "@/components/admin/speaking-recording-review"
import { PodcastListenCoverageBar } from "@/components/admin/podcast-listen-coverage-bar"
import { listenedCoveragePercent, resolveListenedSegments } from "@/lib/podcast-listening"
import { useAdminData } from "@/lib/admin-data-context"
import { resolveMistakeCorrectAnswer } from "@/lib/homework-review"

const STATUS_META: Record<HomeworkStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  paused: { label: "Paused", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
}

const INTEGRITY_META = {
  ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700" },
  suspicion: { label: "Suspicion", cls: "bg-amber-100 text-amber-800" },
  detected: { label: "Cheating", cls: "bg-red-100 text-red-800" },
} as const

const FAILED_STATUS_META = {
  label: "Failed",
  cls: "bg-red-100 text-red-800",
  dot: "bg-red-500",
} as const

const OVERDUE_STATUS_META = {
  label: "Overdue",
  cls: "bg-rose-100 text-rose-800",
  dot: "bg-rose-500",
} as const

// Lower number = appears earlier. Completed first, not completed last.
const STATUS_RANK: Record<HomeworkStatus, number> = {
  graded: 0,
  submitted: 1,
  paused: 2,
  in_progress: 3,
  pending: 4,
}

type Row = HomeworkStudentRow

function isAudioUrl(value: string | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

function formatListenDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function speakingRecordingsCount(sub?: HomeworkSubmission): number {
  return sub?.attempt?.mistakes?.filter((m) => isAudioUrl(m.userAnswer)).length ?? 0
}

type SortKey = "student" | "status" | "integrity" | "correct" | "submitted"
type SortDir = "asc" | "desc"

const INTEGRITY_RANK: Record<keyof typeof INTEGRITY_META, number> = {
  detected: 0,
  suspicion: 1,
  ok: 2,
}

export function HomeworkStudentResults({
  homework,
  students,
  groups,
  submissions,
  onChanged,
}: {
  homework: HomeworkAssignment
  /** Preloaded by the parent — no per-click fetch. */
  students: Student[]
  groups: Group[]
  /** Submissions for THIS homework (already filtered by the parent). */
  submissions: HomeworkSubmission[]
  onChanged?: () => void
}) {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [pendingRetry, setPendingRetry] = useState<Row | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("status")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)

  const selectedRow = useMemo(
    () => rows.find((r) => r.studentId === selectedId) ?? null,
    [rows, selectedId],
  )

  // Build rows: current group members + anyone with a submission (e.g. former members).
  useEffect(() => {
    setRows(buildHomeworkStudentRows(students, submissions, homework.groupId))
    setSelectedId(null)
  }, [homework, students, groups, submissions])

  // Load full submission (with attempt) when opening the detail modal if missing.
  useEffect(() => {
    if (!selectedId || !selectedRow?.submission?.id) return
    const sub = selectedRow.submission
    if (sub.attempt && hasSubmissionResults(sub)) return
    if (sub.status !== "submitted" && sub.status !== "graded") return

    let cancelled = false
    setDetailLoadingId(selectedId)
    homeworkApi
      .submissions({ homeworkId: homework.id, studentId: selectedId })
      .then((freshSubs) => {
        if (cancelled || freshSubs.length === 0) return
        const fresh = freshSubs[0]
        setRows((prev) =>
          prev.map((r) =>
            r.studentId === selectedId
              ? {
                  ...r,
                  submission: fresh,
                  status: fresh.status as HomeworkStatus,
                  score: fresh.score != null ? String(fresh.score) : r.score,
                  feedback: fresh.feedback ?? r.feedback,
                  recordingGrades: recordingGradesFromMistakes(fresh.attempt?.mistakes ?? []),
                }
              : r,
          ),
        )
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoadingId(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedId, homework.id, selectedRow?.submission?.id, selectedRow?.submission?.status])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "student" ? "asc" : key === "submitted" ? "desc" : "asc")
    }
  }

  const sortedRows = useMemo(() => {
    const dueEnd = endOfDueDay(homework.dueAt)
    const dir = sortDir === "asc" ? 1 : -1

    return [...rows].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "student":
          cmp = a.studentName.localeCompare(b.studentName, undefined, { sensitivity: "base" })
          break
        case "status":
          cmp = statusSortRank(a, homework.dueAt) - statusSortRank(b, homework.dueAt)
          break
        case "integrity":
          cmp = integritySortRank(a.submission) - integritySortRank(b.submission)
          break
        case "correct":
          cmp =
            accuracyOf(a.submission, homework.subject) -
            accuracyOf(b.submission, homework.subject)
          break
        case "submitted": {
          const subA = submittedSortTime(a.submission, dueEnd)
          const subB = submittedSortTime(b.submission, dueEnd)
          cmp = subA - subB
          break
        }
      }
      if (cmp !== 0) return cmp * dir
      return a.studentName.localeCompare(b.studentName, undefined, { sensitivity: "base" })
    })
  }, [rows, homework.dueAt, homework.subject, sortKey, sortDir])

  const counts = useMemo(() => {
    const c = { done: 0, working: 0, pending: 0, overdue: 0, cheating: 0 }
    for (const r of rows) {
      if (isCheatingFailed(r.submission)) c.cheating += 1
      if (r.status === "submitted" || r.status === "graded") c.done += 1
      else if (r.status === "in_progress" || r.status === "paused") c.working += 1
      else if (isOverdueRow(r, homework.dueAt)) c.overdue += 1
      else c.pending += 1
    }
    return c
  }, [rows, homework.dueAt])

  const updateRow = (studentId: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, ...patch, dirty: true } : r)),
    )
  }

  const updateRecordingGrade = (
    studentId: string,
    questionId: number,
    patch: Partial<RecordingGradeDraft>,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r
        return {
          ...r,
          dirty: true,
          recordingGrades: r.recordingGrades.map((g) =>
            g.questionId === questionId ? { ...g, ...patch } : g,
          ),
        }
      }),
    )
  }

  const confirmRetry = async () => {
    const row = pendingRetry
    const submissionId = row?.submission?.id
    if (!submissionId) {
      toast({
        title: "Could not assign retry",
        description: "Submission record is missing — refresh the page and try again.",
        variant: "destructive",
      })
      return
    }
    setRetryingId(row.studentId)
    try {
      const updated = await homeworkApi.retry(submissionId)
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === row.studentId
            ? {
                ...r,
                submission: updated,
                status: "pending",
                score: "",
                feedback: "",
                recordingGrades: [],
                dirty: false,
              }
            : r,
        ),
      )
      setPendingRetry(null)
      toast({
        title: "Retry assigned",
        description: `${row.studentName} can solve this homework again.`,
      })
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not assign retry",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRetryingId(null)
    }
  }

  const saveRow = async (row: Row) => {
    if (!row.submission) {
      toast({
        title: "No submission record",
        description: "This student wasn't in the group when homework was created.",
        variant: "destructive",
      })
      return
    }
    const isSpeakingHomework = homework.subject === "speaking"
    const parsedScore = row.score.trim()
      ? Number(row.score.replace(",", "."))
      : undefined
    if (parsedScore !== undefined && (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 9)) {
      toast({
        title: "Invalid score",
        description: "Score must be between 0 and 9.",
        variant: "destructive",
      })
      return
    }

    const recordingGrades: Array<{ questionId: number; score?: number; feedback?: string }> = []
    for (const grade of row.recordingGrades) {
      const trimmedScore = grade.score.trim()
      const parsedRecordingScore = trimmedScore
        ? Number(trimmedScore.replace(",", "."))
        : undefined
      if (
        parsedRecordingScore !== undefined &&
        (Number.isNaN(parsedRecordingScore) ||
          parsedRecordingScore < 0 ||
          parsedRecordingScore > 9)
      ) {
        toast({
          title: "Invalid recording score",
          description: `Question ${grade.questionId}: score must be between 0 and 9.`,
          variant: "destructive",
        })
        return
      }
      const trimmedFeedback = grade.feedback.trim()
      if (parsedRecordingScore != null || trimmedFeedback) {
        recordingGrades.push({
          questionId: grade.questionId,
          score: parsedRecordingScore,
          feedback: trimmedFeedback || undefined,
        })
      }
    }

    const hasRecordingGrades = recordingGrades.length > 0
    const submittedAt =
      row.status === "submitted" || row.status === "graded"
        ? row.submission.submittedAt ?? new Date().toISOString()
        : undefined
    const nextStatus =
      isSpeakingHomework && (parsedScore != null || hasRecordingGrades)
        ? "graded"
        : row.status

    setSavingId(row.studentId)
    try {
      await homeworkApi.grade(row.submission.id, {
        status: nextStatus,
        score: parsedScore,
        feedback: row.feedback.trim() || undefined,
        submittedAt,
        recordingGrades: hasRecordingGrades ? recordingGrades : undefined,
      })
      const updatedMistakes = row.submission.attempt?.mistakes.map((m) => {
        const grade = row.recordingGrades.find((g) => g.questionId === m.questionId)
        if (!grade) return m
        const parsedRecordingScore = grade.score.trim()
          ? Number(grade.score.replace(",", "."))
          : undefined
        return {
          ...m,
          score:
            parsedRecordingScore != null && !Number.isNaN(parsedRecordingScore)
              ? parsedRecordingScore
              : undefined,
          feedback: grade.feedback.trim() || undefined,
        }
      })
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === row.studentId
            ? {
                ...r,
                dirty: false,
                status: nextStatus,
                recordingGrades: recordingGradesFromMistakes(updatedMistakes ?? []),
                submission: r.submission
                  ? {
                      ...r.submission,
                      status: nextStatus,
                      score: parsedScore,
                      feedback: row.feedback.trim() || undefined,
                      submittedAt,
                      attempt: r.submission.attempt
                        ? {
                            ...r.submission.attempt,
                            mistakes: updatedMistakes ?? r.submission.attempt.mistakes,
                          }
                        : undefined,
                    }
                  : undefined,
              }
            : r,
        ),
      )
      toast({ title: "Saved", description: `${row.studentName} updated` })
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
        No students in this group.
      </div>
    )
  }

  const isSpeaking = homework.subject === "speaking"
  const isListening = homework.subject === "listening"

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-500">
        Assigned to group · {formatShortDateTime(homework.createdAt)}
        {homework.timeLimitMinutes != null && homework.timeLimitMinutes > 0
          ? ` · ${homework.timeLimitMinutes} min limit`
          : " · unlimited time"}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          {counts.done} completed
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
          <Clock className="h-3 w-3" />
          {counts.working} in progress
        </span>
        {counts.overdue > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">
            <AlertTriangle className="h-3 w-3" />
            {counts.overdue} overdue
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
          <XCircle className="h-3 w-3" />
          {counts.pending} not started
        </span>
        {counts.cheating > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-800">
            <AlertTriangle className="h-3 w-3" />
            {counts.cheating} cheating
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <SortableTh label="Student" active={sortKey === "student"} dir={sortDir} onSort={() => toggleSort("student")} />
              <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onSort={() => toggleSort("status")} />
              <SortableTh label="Integrity" active={sortKey === "integrity"} dir={sortDir} onSort={() => toggleSort("integrity")} />
              <SortableTh
                label={isSpeaking ? "Recordings" : isListening ? "Listening" : "Correct"}
                active={sortKey === "correct"}
                dir={sortDir}
                onSort={() => toggleSort("correct")}
              />
              <SortableTh label="Submitted" active={sortKey === "submitted"} dir={sortDir} onSort={() => toggleSort("submitted")} />
              <th className="py-3 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => {
              const sMeta = displayStatusMeta(row.status, row.submission, homework.dueAt)
              const cheatingFailed = isCheatingFailed(row.submission)
              const integrity = integrityDisplay(row.submission)
              const submissionLabel = submissionTimeLabel(row.submission, homework.dueAt)
              const attempt = row.submission?.attempt
              const recordingsCount = speakingRecordingsCount(row.submission)
              const accuracy =
                !isSpeaking && !isListening && attempt && attempt.totalQuestions > 0
                  ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
                  : null
              const numericScore = row.submission?.score
              const canExpand = !!row.submission
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
                        <StatusBadge meta={sMeta} />
                        {attempt?.timedOut && !cheatingFailed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                            <AlertTriangle className="h-3 w-3" />
                            Time
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {integrity ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            INTEGRITY_META[integrity].cls,
                          )}
                        >
                          {integrity === "detected" && <AlertTriangle className="h-3 w-3" />}
                          {INTEGRITY_META[integrity].label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {cheatingFailed ? (
                        <span className="text-xs font-semibold text-red-700">—</span>
                      ) : isSpeaking && attempt ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="tabular-nums text-slate-700">
                            {recordingsCount}/{attempt.totalQuestions}
                          </span>
                          {typeof numericScore === "number" && !Number.isNaN(numericScore) ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                                bandClass(numericScore),
                              )}
                            >
                              <Award className="h-3 w-3" />
                              {numericScore.toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      ) : isListening && attempt?.listeningStats ? (
                        <span className="inline-flex flex-col gap-0.5 text-xs">
                          <span className="tabular-nums text-slate-700">
                            {formatListenDuration(attempt.listeningStats.totalListenSeconds)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {attempt.listeningStats.seekCount} seeks
                          </span>
                        </span>
                      ) : attempt && accuracy != null ? (
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
                      <span className="inline-flex flex-col gap-0.5 whitespace-nowrap">
                        <span className={cn("text-xs", submissionLabel.primaryCls)}>
                          {submissionLabel.primary}
                        </span>
                        {submissionLabel.secondary && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold",
                              submissionLabel.secondaryCls ?? "text-slate-400",
                            )}
                          >
                            {submissionLabel.secondary}
                          </span>
                        )}
                      </span>
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
        <DialogContent
          className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {selectedRow && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    meta={displayStatusMeta(selectedRow.status, selectedRow.submission, homework.dueAt)}
                  />
                  {selectedRow.submission && integrityDisplay(selectedRow.submission) && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        INTEGRITY_META[integrityDisplay(selectedRow.submission)!].cls,
                      )}
                    >
                      {integrityDisplay(selectedRow.submission) === "detected" && (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {INTEGRITY_META[integrityDisplay(selectedRow.submission)!].label}
                    </span>
                  )}
                  {selectedRow.submission?.startedAt && (
                    <span className="text-[11px] text-slate-500">
                      Started {formatShortDateTime(selectedRow.submission.startedAt)}
                    </span>
                  )}
                  {selectedRow.submission?.submittedAt && (
                    <span className="text-[11px] text-slate-500">
                      ·{" "}
                      {isCheatingFailed(selectedRow.submission) ? "Failed" : "Submitted"}{" "}
                      {formatShortDateTime(selectedRow.submission.submittedAt)}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl mt-2 text-left">
                  {selectedRow.studentName}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="px-6 py-5">
                  <StudentDetail
                    row={selectedRow}
                    homework={homework}
                    loadingDetails={detailLoadingId === selectedRow.studentId}
                    onUpdate={updateRow}
                    onRecordingGradeChange={updateRecordingGrade}
                    onSave={saveRow}
                    onChanged={onChanged}
                    onRequestRetry={() => setPendingRetry(selectedRow)}
                    saving={savingId === selectedRow.studentId}
                    retrying={retryingId === selectedRow.studentId}
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingRetry}
        onOpenChange={(open) => !open && setPendingRetry(null)}
        title="Assign retry for this student?"
        description={
          pendingRetry && (
            <>
              <span className="font-semibold text-foreground">{pendingRetry.studentName}</span> will
              need to solve{" "}
              <span className="font-semibold text-foreground">{homework.title}</span> again. Their
              current attempt, score, and feedback will be cleared.
            </>
          )
        }
        confirmLabel="Assign retry"
        destructive={false}
        onConfirm={confirmRetry}
        loading={!!pendingRetry && retryingId === pendingRetry.studentId}
      />
    </div>
  )
}

function StudentDetail({
  row,
  homework,
  loadingDetails = false,
  onUpdate,
  onRecordingGradeChange,
  onSave,
  onChanged,
  onRequestRetry,
  saving = false,
  retrying = false,
}: {
  row: Row
  homework: HomeworkAssignment
  onUpdate: (studentId: string, patch: Partial<Row>) => void
  onRecordingGradeChange: (
    studentId: string,
    questionId: number,
    patch: Partial<RecordingGradeDraft>,
  ) => void
  onSave: (row: Row) => void
  onChanged?: () => void
  onRequestRetry?: () => void
  saving?: boolean
  retrying?: boolean
  loadingDetails?: boolean
}) {
  const { toast } = useToast()
  const { exercises } = useAdminData()
  const exercise = useMemo(
    () => exercises.find((e) => e.slug === homework.exerciseSlug) ?? null,
    [exercises, homework.exerciseSlug],
  )
  const [transcribing, setTranscribing] = useState(false)
  const attempt = row.submission?.attempt
  const cheatingFailed = isCheatingFailed(row.submission)
  const isSpeaking = homework.subject === "speaking"
  const isListening = homework.subject === "listening"
  const listeningStats = attempt?.listeningStats
  const podcastDurationSeconds = listeningStats?.podcastDurationSeconds ?? 0
  const listenCoveragePct =
    podcastDurationSeconds > 0 && listeningStats
      ? listenedCoveragePercent(
          resolveListenedSegments(listeningStats),
          podcastDurationSeconds,
        )
      : null
  const speakingRecordings =
    attempt?.mistakes?.filter((m) => isAudioUrl(m.userAnswer)) ?? []
  const missingTranscription = speakingRecordings.some((m) => !m.transcription?.trim())
  const accuracy =
    !isSpeaking && !isListening && attempt && attempt.totalQuestions > 0
      ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
      : null
  const numericScore = row.submission?.score
  const retryCount = retryCountFromEvents(row.submission)
  const canRetry = canAssignRetry(row.submission)
  const overdueMissed = isOverdueRow(row, homework.dueAt)
  const submittedLate =
    row.submission?.submittedAt &&
    isDuePassed(homework.dueAt) &&
    new Date(row.submission.submittedAt).getTime() > endOfDueDay(homework.dueAt)

  const handleTranscribe = async () => {
    const submissionId = row.submission?.id
    if (!submissionId) return
    setTranscribing(true)
    try {
      const updated = await homeworkApi.transcribe(submissionId)
      onUpdate(row.studentId, {
        submission: updated,
        recordingGrades: recordingGradesFromMistakes(updated.attempt?.mistakes ?? []),
      })
      onChanged?.()
      toast({ title: "Transcription complete" })
    } catch (err) {
      toast({
        title: "Transcription failed",
        description: err instanceof Error ? err.message : "Could not transcribe recordings",
        variant: "destructive",
      })
    } finally {
      setTranscribing(false)
    }
  }

  return (
    <div className="space-y-3">
      {loadingDetails && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
          Loading submission details…
        </div>
      )}

      {overdueMissed && !row.submission?.submittedAt && (
        <OverdueNotice homework={homework} submission={row.submission} status={row.status} />
      )}

      {submittedLate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Submitted after the due date ({daysPastDue(homework.dueAt)} day
          {daysPastDue(homework.dueAt) === 1 ? "" : "s"} late)
        </div>
      )}

      {cheatingFailed && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            <span className="text-sm font-semibold text-red-800">Cheating detected</span>
          </div>
          <p className="mt-1 text-xs text-red-700/90">
            {attempt?.cheatingReason
              ? `Reason: ${attempt.cheatingReason.replace(/_/g, " ")}`
              : "The student left the app after using their pause."}
          </p>
          {(row.submission?.entryCount ?? 0) > 0 && (
            <p className="mt-1 text-xs text-red-700/80">
              Session entries: {row.submission?.entryCount}
            </p>
          )}
          {row.submission?.submittedAt && (
            <p className="mt-2 text-[11px] text-red-700/80">
              Failed at {formatShortDateTime(row.submission.submittedAt)}
            </p>
          )}
        </div>
      )}

      {hasSubmissionResults(row.submission) && attempt ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {isSpeaking
                  ? "Speaking recordings"
                  : isListening
                    ? "Listening result"
                    : "Exercise result"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-900 ring-1 ring-slate-200">
                {isSpeaking
                  ? `${speakingRecordings.length}/${attempt.totalQuestions} submitted`
                  : isListening && listeningStats
                    ? formatListenDuration(listeningStats.totalListenSeconds)
                    : `${attempt.correctCount}/${attempt.totalQuestions} correct`}
              </span>
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
              ) : null}
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
          {isListening && listeningStats ? (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800">
                    <Clock className="h-3.5 w-3.5" />
                    Total listened
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatListenDuration(listeningStats.totalListenSeconds)}
                  </p>
                  {listenCoveragePct != null && listeningStats ? (
                    <div className="mt-2.5 space-y-2 rounded-md border border-indigo-100/80 bg-white/70 px-2.5 py-2">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Episode length
                          </p>
                          <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-800">
                            {formatListenDuration(podcastDurationSeconds)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Coverage
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-xl font-bold tabular-nums leading-none",
                              listenCoveragePct >= 80
                                ? "text-emerald-600"
                                : listenCoveragePct >= 50
                                  ? "text-indigo-600"
                                  : "text-amber-600",
                            )}
                          >
                            {listenCoveragePct}%
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <PodcastListenCoverageBar
                          durationSeconds={podcastDurationSeconds}
                          segments={listeningStats.listenedSegments}
                          totalListenSeconds={listeningStats.totalListenSeconds}
                        />
                        <div className="flex items-center justify-between text-[10px] tabular-nums text-slate-500">
                          <span>
                            {formatListenDuration(listeningStats.totalListenSeconds)} listened
                          </span>
                          <span>{formatListenDuration(podcastDurationSeconds)} total</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800">
                    <Headphones className="h-3.5 w-3.5" />
                    Seeks &amp; rewinds
                  </div>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {listeningStats.seekCount}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {listeningStats.rewindCount} backward · {listeningStats.forwardCount} forward
                  </p>
                </div>
              </div>
              {listeningStats.wordsReviewed > 0 ? (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {listeningStats.wordsReviewed} words reviewed after listening
                </p>
              ) : null}
            </div>
          ) : isSpeaking ? (
            speakingRecordings.length > 0 ? (
              <>
                {missingTranscription ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                    <p className="text-[11px] text-amber-900">
                      Some recordings have no transcription yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-amber-200 bg-white text-xs"
                      onClick={() => void handleTranscribe()}
                      disabled={transcribing}
                    >
                      <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", transcribing && "animate-spin")} />
                      {transcribing ? "Transcribing…" : "Run transcription"}
                    </Button>
                  </div>
                ) : null}
              <ul className="mt-4 space-y-3">
                {speakingRecordings.map((m, idx) => {
                  const grade =
                    row.recordingGrades.find((g) => g.questionId === m.questionId) ?? {
                      questionId: m.questionId,
                      score: "",
                      feedback: "",
                    }
                  return (
                    <SpeakingRecordingReviewCard
                      key={`${row.studentId}-${m.questionId}`}
                      mistake={m}
                      grade={grade}
                      index={idx}
                      onChange={(patch) =>
                        onRecordingGradeChange(row.studentId, m.questionId, patch)
                      }
                    />
                  )
                })}
              </ul>
              </>
            ) : (
              <p className="mt-2 text-[11px] text-slate-500">No recordings submitted yet.</p>
            )
          ) : attempt.mistakes.length > 0 ? (
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
                      Correct:{" "}
                      <span className="font-semibold">
                        {resolveMistakeCorrectAnswer(exercise, m)}
                      </span>
                    </span>
                  </div>
                  {m.explanation && (
                    <p className="mt-1 text-[11px] italic text-slate-500">{m.explanation}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : attempt.totalQuestions > 0 && attempt.correctCount >= attempt.totalQuestions ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              All answers correct
            </p>
          ) : attempt.totalQuestions > 0 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              {attempt.correctCount}/{attempt.totalQuestions} answered — individual mistakes
              were not stored for this attempt.
            </p>
          ) : null}
        </div>
      ) : hasSubmissionResults(row.submission) ? (
        <SubmittedSummary submission={row.submission!} />
      ) : overdueMissed ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500">
          <p>No submission recorded before the deadline.</p>
        </div>
      ) : row.status === "pending" ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500">
          <p>Student has not started this homework yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-[11px] text-slate-500">
          <p>No detailed attempt recorded for this submission.</p>
        </div>
      )}

      <div className={cn("grid gap-3", isSpeaking ? "sm:grid-cols-2" : "")}>
        {isSpeaking ? (
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500">
              Score (0–9)
            </label>
            <Input
              value={row.score}
              onChange={(e) => onUpdate(row.studentId, { score: e.target.value })}
              placeholder="e.g. 6.5"
              className="mt-1"
            />
          </div>
        ) : null}
        <div className={isSpeaking ? "" : "sm:col-span-2"}>
          <label className="text-[11px] uppercase tracking-wider text-slate-500">
            Overall feedback
          </label>
          <Textarea
            value={row.feedback}
            onChange={(e) => onUpdate(row.studentId, { feedback: e.target.value })}
            placeholder="Optional summary for the student"
            rows={2}
            className="mt-1 min-h-[72px] resize-y"
          />
        </div>
      </div>

      {retryCount > 0 && (
        <p className="text-[11px] text-slate-500">
          Retries assigned: <span className="font-semibold text-slate-700">{retryCount}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {canRetry && onRequestRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRequestRetry}
            loading={retrying}
            disabled={saving}
            className="border-sky-200 text-sky-800 hover:bg-sky-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Assign retry
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="sm"
          onClick={() => onSave(row)}
          loading={saving}
          disabled={!row.dirty || retrying}
          className={cn("bg-emerald-600 hover:bg-emerald-700", !row.dirty && "opacity-50")}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {row.dirty ? "Save" : "Saved"}
        </Button>
      </div>
    </div>
  )
}

function accuracyOf(sub?: HomeworkSubmission, subject?: HomeworkAssignment["subject"]): number {
  const a = sub?.attempt
  if (!a || a.totalQuestions === 0) return -1
  if (subject === "speaking") return speakingRecordingsCount(sub) / a.totalQuestions
  if (subject === "listening") {
    if (a.listeningStats?.completedListening) return 1
    return -1
  }
  return a.correctCount / a.totalQuestions
}

function statusSortRank(row: Row, dueAt: string): number {
  if (isCheatingFailed(row.submission)) return -1
  if (isOverdueRow(row, dueAt)) return STATUS_RANK.pending - 0.5
  return STATUS_RANK[row.status] ?? 99
}

function isOverdueRow(row: Row, dueAt: string): boolean {
  if (row.status === "submitted" || row.status === "graded") return false
  if (isCheatingFailed(row.submission)) return false
  if (!isDuePassed(dueAt)) return false
  return !row.submission?.submittedAt
}

function submissionTimeLabel(
  submission: HomeworkSubmission | undefined,
  dueAt: string,
): {
  primary: string
  secondary?: string
  primaryCls?: string
  secondaryCls?: string
} {
  const day = 24 * 60 * 60 * 1000
  const dueEnd = endOfDueDay(dueAt)
  const overdue = isDuePassed(dueAt)
  const submittedAt = submission?.submittedAt
  const startedAt = submission?.startedAt

  if (submittedAt) {
    const lateBy = Math.floor((new Date(submittedAt).getTime() - dueEnd) / day)
    return {
      primary: formatShortDateTime(submittedAt),
      secondary: lateBy > 0 ? `${lateBy}d late` : "on time",
      secondaryCls: lateBy > 0 ? "text-rose-600" : "text-emerald-600",
    }
  }

  if (startedAt) {
    const daysLate = daysPastDue(dueAt)
    return {
      primary: `Started ${formatShortDateTime(startedAt)}`,
      secondary: overdue
        ? daysLate > 0
          ? `${daysLate}d overdue · in progress`
          : "overdue · in progress"
        : "in progress",
      secondaryCls: overdue ? "text-rose-600" : "text-slate-400 italic",
    }
  }

  if (overdue) {
    const daysLate = daysPastDue(dueAt)
    return {
      primary: "Overdue",
      secondary:
        daysLate > 0
          ? `${daysLate}d past deadline · not started`
          : "past deadline · not started",
      primaryCls: "font-semibold text-rose-700",
      secondaryCls: "text-rose-600",
    }
  }

  return {
    primary: "Not started",
    primaryCls: "italic text-slate-400",
  }
}

function integritySortRank(sub?: HomeworkSubmission): number {
  const label = integrityDisplay(sub)
  if (!label) return 99
  return INTEGRITY_RANK[label]
}

function submittedSortTime(sub: HomeworkSubmission | undefined, dueAt: number): number {
  if (sub?.submittedAt) return new Date(sub.submittedAt).getTime()
  if (sub?.startedAt) return new Date(sub.startedAt).getTime()
  return dueAt + 1
}

function SortableTh({
  label,
  active,
  dir,
  onSort,
}: {
  label: string
  active: boolean
  dir: SortDir
  onSort: () => void
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className="py-3 px-3 font-semibold">
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-slate-800",
          active && "text-slate-800",
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-slate-700" : "text-slate-400")} />
      </button>
    </th>
  )
}

function accuracyClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function bandClass(score: number): string {
  if (score >= 7) return "bg-emerald-100 text-emerald-800"
  if (score >= 5.5) return "bg-sky-100 text-sky-800"
  if (score >= 4) return "bg-amber-100 text-amber-800"
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

function formatShortDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function OverdueNotice({
  homework,
  submission,
  status,
}: {
  homework: HomeworkAssignment
  submission?: HomeworkSubmission
  status: HomeworkStatus
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-[11px] text-rose-900">
      <p className="inline-flex items-center gap-1.5 font-semibold text-rose-800">
        <AlertTriangle className="h-3.5 w-3.5" />
        {status === "in_progress" || status === "paused" ? "Overdue · in progress" : "Missed deadline"}
      </p>
      <p className="mt-1">
        Due {new Date(homework.dueAt).toLocaleDateString()} · {daysPastDue(homework.dueAt)} day
        {daysPastDue(homework.dueAt) === 1 ? "" : "s"} overdue
      </p>
      {submission?.assignedAt && (
        <p className="mt-1">Assigned {formatShortDateTime(submission.assignedAt)}</p>
      )}
      {submission?.startedAt && (
        <p className="mt-1">Started {formatShortDateTime(submission.startedAt)}</p>
      )}
      {(submission?.entryCount ?? 0) > 0 && !submission?.submittedAt && (
        <p className="mt-1">
          Opened {submission.entryCount} time{submission.entryCount === 1 ? "" : "s"} but not
          submitted
        </p>
      )}
    </div>
  )
}

function SubmittedSummary({ submission }: { submission: HomeworkSubmission }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Submission summary
      </p>
      {submission.submittedAt && (
        <p className="mt-2 text-slate-700">
          Submitted {formatShortDateTime(submission.submittedAt)}
        </p>
      )}
      {typeof submission.score === "number" && !Number.isNaN(submission.score) && (
        <p className="mt-1 tabular-nums text-slate-700">
          Score: <span className="font-semibold">{submission.score.toFixed(1)}</span>
        </p>
      )}
      {submission.feedback && (
        <p className="mt-2 text-xs text-slate-600">{submission.feedback}</p>
      )}
      {!submission.attempt && (
        <p className="mt-2 text-[11px] text-slate-500">
          Detailed answer breakdown is not available for this submission.
        </p>
      )}
    </div>
  )
}

function isCheatingFailed(sub?: HomeworkSubmission): boolean {
  return (
    sub?.integrityStatus === "cheating_detected" || sub?.attempt?.failedDueToCheating === true
  )
}

function displayStatusMeta(
  status: HomeworkStatus,
  submission?: HomeworkSubmission,
  dueAt?: string,
): { label: string; cls: string; dot: string } {
  if (isCheatingFailed(submission)) return FAILED_STATUS_META
  if (
    dueAt &&
    isDuePassed(dueAt) &&
    status !== "submitted" &&
    status !== "graded" &&
    !submission?.submittedAt
  ) {
    return OVERDUE_STATUS_META
  }
  return STATUS_META[status] ?? STATUS_META.pending
}

function StatusBadge({ meta }: { meta: { label: string; cls: string; dot: string } }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        meta.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}

function canAssignRetry(sub?: HomeworkSubmission): boolean {
  if (!sub) return false
  return (
    sub.status !== "pending" ||
    !!sub.attempt ||
    !!sub.startedAt ||
    (sub.entryCount ?? 0) > 0
  )
}

function retryCountFromEvents(sub?: HomeworkSubmission): number {
  return sub?.events?.filter((e) => e.type === "retry").length ?? 0
}

function integrityDisplay(
  sub?: HomeworkSubmission,
): keyof typeof INTEGRITY_META | null {
  if (!sub) return null
  if (isCheatingFailed(sub)) return "detected"
  if (sub.integrityStatus === "cheating_suspicion") return "suspicion"
  if (sub.integrityStatus === "ok") return "ok"
  return null
}
