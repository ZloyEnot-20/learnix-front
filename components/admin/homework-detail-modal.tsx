"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Award,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  Headphones,
  Mic,
  PenTool,
  Save,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react"
import type {
  HomeworkAssignment,
  HomeworkStatus,
  HomeworkSubmission,
  Subject,
} from "@/lib/admin-storage"
import { useAdminData } from "@/lib/admin-data-context"
import { homeworkApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const SUBJECT_META: Record<Subject, { icon: typeof BookOpen; color: string; label: string }> = {
  reading: { icon: BookOpen, color: "#c1bffd", label: "Reading" },
  listening: { icon: Headphones, color: "#ffcc3e", label: "Listening" },
  writing: { icon: PenTool, color: "#a7e237", label: "Writing" },
  speaking: { icon: Mic, color: "#9fcffb", label: "Speaking" },
  grammar: { icon: GraduationCap, color: "#fcd5a4", label: "Grammar" },
  vocabulary: { icon: BookMarked, color: "#d8b4fe", label: "Vocabulary" },
}

const STATUS_META: Record<HomeworkStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
}

interface HomeworkDetailModalProps {
  homework: HomeworkAssignment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

interface Row {
  studentId: string
  studentName: string
  submission?: HomeworkSubmission
  status: HomeworkStatus
  score: string
  feedback: string
  dirty: boolean
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function HomeworkDetailModal({
  homework,
  open,
  onOpenChange,
  onChanged,
}: HomeworkDetailModalProps) {
  const { toast } = useToast()
  const { students: allStudents, groups } = useAdminData()
  const [rows, setRows] = useState<Row[]>([])
  const [groupName, setGroupName] = useState<string>("—")
  const [filter, setFilter] = useState<"all" | HomeworkStatus>("all")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const toggleExpanded = (studentId: string) => {
    setExpanded((prev) => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  useEffect(() => {
    if (!homework || !open) {
      setRows([])
      setGroupName("—")
      return
    }
    let cancelled = false
    homeworkApi
      .submissions({ homeworkId: homework.id })
      .then((submissions) => {
        if (cancelled) return
        const group = groups.find((g) => g.id === homework.groupId)
        setGroupName(group?.name ?? "—")
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
              score: sub?.score != null ? String(sub.score) : "",
              feedback: sub?.feedback ?? "",
              dirty: false,
            }
          })
          .filter(Boolean) as Row[]

        setRows(built)
        setFilter("all")
        setExpanded({})
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
    return () => {
      cancelled = true
    }
  }, [homework, open, groups, allStudents])

  const counts = useMemo(() => {
    const c: Record<"all" | HomeworkStatus, number> = {
      all: rows.length,
      pending: 0,
      in_progress: 0,
      submitted: 0,
      graded: 0,
    }
    for (const r of rows) c[r.status] += 1
    return c
  }, [rows])

  const resultsSummary = useMemo(() => {
    const total = rows.length
    if (total === 0) {
      return {
        avgAccuracyPct: null as number | null,
        avgCorrect: null as number | null,
        avgTotal: null as number | null,
        withAttempt: 0,
        completionPct: 0,
        onTimePct: 0,
      }
    }
    const dueAt = homework ? new Date(homework.dueAt).getTime() : 0
    let correctSum = 0
    let totalSum = 0
    let accuracySum = 0
    let withAttempt = 0
    let completed = 0
    let onTime = 0
    for (const r of rows) {
      const a = r.submission?.attempt
      if (a && a.totalQuestions > 0) {
        correctSum += a.correctCount
        totalSum += a.totalQuestions
        accuracySum += a.correctCount / a.totalQuestions
        withAttempt += 1
      }
      const isDone = r.status === "submitted" || r.status === "graded"
      if (isDone) {
        completed += 1
        const submittedAt = r.submission?.submittedAt
          ? new Date(r.submission.submittedAt).getTime()
          : null
        if (submittedAt && dueAt && submittedAt <= dueAt) onTime += 1
      }
    }
    return {
      avgAccuracyPct: withAttempt > 0 ? Math.round((accuracySum / withAttempt) * 100) : null,
      avgCorrect: withAttempt > 0 ? correctSum / withAttempt : null,
      avgTotal: withAttempt > 0 ? totalSum / withAttempt : null,
      withAttempt,
      completionPct: Math.round((completed / total) * 100),
      onTimePct: completed > 0 ? Math.round((onTime / completed) * 100) : 0,
    }
  }, [rows, homework])

  const filtered = useMemo(() => {
    return filter === "all" ? rows : rows.filter((r) => r.status === filter)
  }, [rows, filter])

  if (!homework) return null

  const meta = SUBJECT_META[homework.subject]
  const Icon = meta.icon
  const overdue = new Date(homework.dueAt).getTime() < Date.now()

  const updateRow = (studentId: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.studentId === studentId ? { ...r, ...patch, dirty: true } : r,
      ),
    )
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
    const submittedAt = row.status === "submitted" || row.status === "graded"
      ? row.submission.submittedAt ?? new Date().toISOString()
      : undefined
    setSavingId(row.studentId)
    try {
      await homeworkApi.grade(row.submission.id, {
        status: row.status,
        score: parsedScore,
        feedback: row.feedback.trim() || undefined,
        submittedAt,
      })
      setRows((prev) =>
        prev.map((r) =>
          r.studentId === row.studentId
            ? {
                ...r,
                dirty: false,
                submission: r.submission
                  ? { ...r.submission, status: r.status, score: parsedScore, feedback: r.feedback.trim() || undefined, submittedAt }
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

  const filters: Array<{ key: "all" | HomeworkStatus; label: string }> = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "in_progress", label: "In progress" },
    { key: "submitted", label: "Submitted" },
    { key: "graded", label: "Graded" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b bg-gradient-to-br from-slate-50 to-white px-6 py-5">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5"
              style={{ backgroundColor: meta.color }}
            >
              <Icon className="h-5 w-5 text-slate-900/80" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg">{homework.title}</DialogTitle>
              <DialogDescription className="mt-1 line-clamp-2 text-slate-500">
                {homework.description || "No description provided"}
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {groupName}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue && "font-semibold text-[#C8102E]",
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {overdue ? "Overdue " : "Due "}
                  {new Date(homework.dueAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {homework.estimatedMinutes} min
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {meta.label}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Class results
                </p>
                <p className="text-xs text-slate-500">
                  Per-student performance for this assignment
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                <Users className="h-3 w-3" />
                {rows.length} student{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ResultMetric
                icon={Award}
                label="Avg correct"
                value={
                  resultsSummary.avgAccuracyPct != null
                    ? `${resultsSummary.avgAccuracyPct}%`
                    : "—"
                }
                hint={
                  resultsSummary.avgCorrect != null && resultsSummary.avgTotal != null
                    ? `${resultsSummary.avgCorrect.toFixed(1)} / ${Math.round(
                        resultsSummary.avgTotal,
                      )} avg`
                    : "No attempts yet"
                }
                accent="bg-violet-50 text-violet-700"
              />
              <ResultMetric
                icon={CheckCircle2}
                label="Completion"
                value={`${resultsSummary.completionPct}%`}
                hint={`${counts.submitted + counts.graded}/${counts.all} done`}
                accent="bg-emerald-50 text-emerald-700"
              />
              <ResultMetric
                icon={TrendingUp}
                label="On time"
                value={
                  counts.submitted + counts.graded > 0
                    ? `${resultsSummary.onTimePct}%`
                    : "—"
                }
                hint="of submitted"
                accent="bg-sky-50 text-sky-700"
              />
              <ResultMetric
                icon={Target}
                label="Pending"
                value={String(counts.pending + counts.in_progress)}
                hint={
                  counts.pending + counts.in_progress === 0
                    ? "all in"
                    : "still working"
                }
                accent="bg-amber-50 text-amber-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <StatPill label="Total" value={counts.all} cls="bg-slate-100 text-slate-700" />
            <StatPill label="Pending" value={counts.pending} cls="bg-slate-100 text-slate-700" />
            <StatPill label="In progress" value={counts.in_progress} cls="bg-amber-50 text-amber-800" />
            <StatPill label="Submitted" value={counts.submitted} cls="bg-sky-50 text-sky-800" />
            <StatPill label="Graded" value={counts.graded} cls="bg-emerald-50 text-emerald-800" />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((f) => {
              const active = filter === f.key
              const count = counts[f.key]
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                  )}
                >
                  {f.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                      active ? "bg-white/15" : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <Separator />

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
              {rows.length === 0
                ? "No students in this group"
                : "No submissions match the current filter"}
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((row) => {
                const sMeta = STATUS_META[row.status]
                const submittedAt = row.submission?.submittedAt
                const numericScore = row.submission?.score
                const dueAt = homework ? new Date(homework.dueAt).getTime() : 0
                const lateBy = submittedAt && dueAt
                  ? Math.floor((new Date(submittedAt).getTime() - dueAt) / (24 * 60 * 60 * 1000))
                  : 0
                const attempt = row.submission?.attempt
                const accuracy = attempt && attempt.totalQuestions > 0
                  ? Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
                  : null
                return (
                  <li
                    key={row.studentId}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C8102E] to-[#A00D25] text-xs font-bold text-white">
                        {initials(row.studentName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900">
                            {row.studentName}
                          </p>
                          <div className="flex items-center gap-1.5">
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
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                sMeta.cls,
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", sMeta.dot)} />
                              {sMeta.label}
                            </span>
                          </div>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          {submittedAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(submittedAt).toLocaleString()}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Not submitted yet</span>
                          )}
                          {submittedAt && lateBy > 0 && (
                            <span className="font-semibold text-rose-600">
                              · {lateBy}d late
                            </span>
                          )}
                          {submittedAt && lateBy <= 0 && (
                            <span className="text-emerald-600">· on time</span>
                          )}
                          {row.feedback && (
                            <span className="truncate text-slate-500">
                              · “{row.feedback}”
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {attempt ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Exercise result
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-900 ring-1 ring-slate-200">
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
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => toggleExpanded(row.studentId)}
                              aria-expanded={!!expanded[row.studentId]}
                              className="group flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-3 py-1.5 text-left transition-colors hover:bg-rose-50"
                            >
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                                <XCircle className="h-3 w-3" />
                                {attempt.mistakes.length} mistake{attempt.mistakes.length === 1 ? "" : "s"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 text-slate-400 transition-transform",
                                  expanded[row.studentId] && "rotate-180",
                                )}
                              />
                            </button>
                            {expanded[row.studentId] && (
                              <ul className="mt-2 space-y-1.5">
                                {attempt.mistakes.map((m) => (
                                  <li
                                    key={`${row.studentId}-${m.questionId}`}
                                    className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs"
                                  >
                                    <p className="text-slate-700">
                                      <span className="font-semibold text-slate-900">Q{m.questionId}.</span>{" "}
                                      {m.prompt}
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
                                      <p className="mt-1 text-[11px] italic text-slate-500">
                                        {m.explanation}
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            All answers correct
                          </p>
                        )}
                      </div>
                    ) : row.status === "pending" ? null : (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-500">
                        No detailed attempt recorded for this submission.
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="text-[11px] uppercase tracking-wider text-slate-500">
                        Feedback
                      </label>
                      <Input
                        value={row.feedback}
                        onChange={(e) => updateRow(row.studentId, { feedback: e.target.value })}
                        placeholder="Optional notes for the student"
                        className="mt-1"
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveRow(row)}
                        loading={savingId === row.studentId}
                        disabled={!row.dirty}
                        className={cn(
                          "bg-emerald-600 hover:bg-emerald-700",
                          !row.dirty && "opacity-50",
                        )}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {row.dirty ? "Save changes" : "Saved"}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t bg-slate-50/60 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatPill({
  label,
  value,
  cls,
}: {
  label: string
  value: number
  cls: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <span
        className={cn(
          "inline-flex h-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold uppercase tracking-wide",
          cls,
        )}
      >
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

function ResultMetric({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Award
  label: string
  value: string
  hint?: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
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
