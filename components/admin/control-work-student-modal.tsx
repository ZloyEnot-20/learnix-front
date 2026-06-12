"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Target,
  XCircle,
} from "lucide-react"
import type {
  ControlWork,
  ControlWorkStepResult,
  ControlWorkSubject,
  ControlWorkSubmission,
  HomeworkStatus,
  Student,
} from "@/lib/admin-storage"
import { cn } from "@/lib/utils"

const SECTION_META: Record<
  ControlWorkSubject,
  { label: string; color: string }
> = {
  vocabulary: { label: "Vocabulary", color: "#d8b4fe" },
  grammar: { label: "Grammar", color: "#fcd5a4" },
  reading: { label: "Reading", color: "#c1bffd" },
  listening: { label: "Listening", color: "#ffcc3e" },
  writing: { label: "Writing", color: "#a7e237" },
}

const STATUS_META: Record<HomeworkStatus, { label: string; cls: string }> = {
  pending: { label: "Not started", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  paused: { label: "Paused", cls: "bg-sky-100 text-sky-800" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800" },
}

function accuracyClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function stepDetail(
  result: ControlWorkStepResult | undefined,
  currentStep: number,
  stepIndex: number,
): { label: string; cls: string; pct?: number } {
  if (!result || result.status === "pending") {
    if (currentStep === stepIndex) {
      return { label: "In progress", cls: "text-amber-700" }
    }
    return { label: "Not started", cls: "text-slate-400" }
  }

  if (result.attempt?.failedDueToCheating) {
    return { label: "Cheating", cls: "text-red-700 font-semibold" }
  }

  const total = result.attempt?.totalQuestions ?? 0
  if (total > 0) {
    const correct = result.attempt?.correctCount ?? 0
    const pct = Math.round((correct / total) * 100)
    return {
      label: `${correct}/${total} correct · ${pct}%`,
      cls: "text-slate-800 font-medium tabular-nums",
      pct,
    }
  }

  return { label: "Submitted", cls: "text-emerald-700 font-medium" }
}

interface ControlWorkStudentModalProps {
  cw: ControlWork | null
  student: Student | null
  submission?: ControlWorkSubmission
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ControlWorkStudentModal({
  cw,
  student,
  submission,
  open,
  onOpenChange,
}: ControlWorkStudentModalProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({})

  const overallPct = useMemo(() => {
    if (!submission?.stepResults?.length) return null
    let correct = 0
    let total = 0
    for (const sr of submission.stepResults) {
      if (sr.status !== "completed" || !sr.attempt) continue
      if (sr.attempt.failedDueToCheating) return null
      total += sr.attempt.totalQuestions ?? 0
      correct += sr.attempt.correctCount ?? 0
    }
    if (total <= 0) return null
    return Math.round((correct / total) * 100)
  }, [submission])

  const cheating = submission?.integrityStatus === "cheating_detected"
  const status = (submission?.status ?? "pending") as HomeworkStatus
  const statusMeta = STATUS_META[status]

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  if (!cw || !student) return null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setExpandedSteps({})
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">{student.name}</DialogTitle>
          <DialogDescription className="text-left">{cw.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
              cheating ? "bg-red-100 text-red-800" : statusMeta.cls,
            )}
          >
            {cheating ? "Cheating detected" : statusMeta.label}
          </span>
          {overallPct != null && !cheating ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                accuracyClass(overallPct),
              )}
            >
              <Target className="h-3 w-3" />
              {overallPct}% overall
            </span>
          ) : null}
          {submission?.submittedAt ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" />
              {new Date(submission.submittedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        <ul className="space-y-3 pt-1">
          {cw.steps.map((step, index) => {
            const result = submission?.stepResults?.[index]
            const detail = stepDetail(result, submission?.currentStep ?? 0, index)
            const attempt = result?.attempt
            const mistakes = attempt?.mistakes ?? []
            const meta = SECTION_META[step.subject]
            const expanded = !!expandedSteps[index]

            return (
              <li
                key={`${step.subject}-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                    title={meta.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {meta.label}
                    </p>
                    <p className="font-medium text-slate-900">{step.title}</p>
                    <p className={cn("mt-1 text-xs", detail.cls)}>{detail.label}</p>
                    {typeof detail.pct === "number" ? (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            detail.pct >= 80
                              ? "bg-emerald-500"
                              : detail.pct >= 60
                                ? "bg-sky-500"
                                : detail.pct >= 40
                                  ? "bg-amber-500"
                                  : "bg-rose-500",
                          )}
                          style={{ width: `${detail.pct}%` }}
                        />
                      </div>
                    ) : null}
                    {attempt?.durationSeconds ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Time: {formatDuration(attempt.durationSeconds)}
                      </p>
                    ) : null}
                  </div>
                </div>

                {attempt && mistakes.length > 0 ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleStep(index)}
                      aria-expanded={expanded}
                      className="group flex w-full items-center justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50/50 px-3 py-1.5 text-left transition-colors hover:bg-rose-50"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                        <XCircle className="h-3 w-3" />
                        {mistakes.length} mistake{mistakes.length === 1 ? "" : "s"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    {expanded ? (
                      <ul className="mt-2 space-y-1.5">
                        {mistakes.map((m) => (
                          <li
                            key={`${index}-${m.questionId}`}
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
                            {m.explanation ? (
                              <p className="mt-1 text-[11px] italic text-slate-500">{m.explanation}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : attempt && (attempt.totalQuestions ?? 0) > 0 ? (
                  (attempt.correctCount ?? 0) >= (attempt.totalQuestions ?? 0) ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      All answers correct
                    </p>
                  ) : (
                    <p className="mt-3 text-[11px] font-semibold text-amber-700">
                      {(attempt.totalQuestions ?? 0) - (attempt.correctCount ?? 0)} incorrect — details
                      not recorded
                    </p>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
