"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Headphones,
  Mail,
  Mic,
  PenTool,
  Phone,
  Users,
  Wallet,
} from "lucide-react"
import type {
  Group,
  HomeworkAssignment,
  HomeworkSubmission,
  Payment,
  Student,
  StudentProgress,
  Subject,
} from "@/lib/admin-storage"
import { getGroups } from "@/lib/admin-cache"
import { homeworkApi, paymentsApi, studentsApi } from "@/lib/api"
import { cn, formatMoney } from "@/lib/utils"
import { StudentDetailModalSkeleton } from "./skeletons"
import { StudentIeltsProfileSection } from "./student-ielts-profile-section"
import { SendStudentNotificationDialog } from "./send-student-notification-dialog"

const SUBJECT_META: Record<Subject, { icon: typeof BookOpen; color: string }> = {
  reading: { icon: BookOpen, color: "#c1bffd" },
  listening: { icon: Headphones, color: "#ffcc3e" },
  writing: { icon: PenTool, color: "#a7e237" },
  speaking: { icon: Mic, color: "#9fcffb" },
  grammar: { icon: GraduationCap, color: "#fcd5a4" },
  vocabulary: { icon: BookMarked, color: "#d8b4fe" },
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800" },
}

function isCheatingFailed(sub: HomeworkSubmission): boolean {
  return sub.integrityStatus === "cheating_detected" || sub.attempt?.failedDueToCheating === true
}

function submissionAccuracy(sub: HomeworkSubmission): number | null {
  const attempt = sub.attempt
  if (!attempt || attempt.totalQuestions <= 0) return null
  return Math.round((attempt.correctCount / attempt.totalQuestions) * 100)
}

function homeworkResultBadge(sub: HomeworkSubmission): { label: string; cls: string } {
  if (isCheatingFailed(sub)) {
    return { label: "Failed", cls: "bg-rose-100 text-rose-700" }
  }
  const accuracy = submissionAccuracy(sub)
  if (accuracy != null && (sub.status === "submitted" || sub.status === "graded")) {
    return { label: `${accuracy}%`, cls: accuracyClass(accuracy) }
  }
  return STATUS_LABEL[sub.status] ?? STATUS_LABEL.pending
}

function accuracyClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700" },
  overdue: { label: "Overdue", cls: "bg-rose-100 text-rose-700" },
}

interface StudentDetailModalProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
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

interface DetailData {
  progress: StudentProgress
  group?: Group
  homeworkRows: Array<{ hw: HomeworkAssignment; sub: HomeworkSubmission }>
  payments: Payment[]
}

export function StudentDetailModal({ student, open, onOpenChange }: StudentDetailModalProps) {
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNotify, setShowNotify] = useState(false)

  useEffect(() => {
    if (!student || !open) {
      setData(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all([
      studentsApi.progress(student.id),
      getGroups(),
      homeworkApi.list(),
      homeworkApi.submissions({ studentId: student.id }),
      paymentsApi.list({ studentId: student.id }),
    ])
      .then(([progress, groups, homeworkList, submissions, allPayments]) => {
        if (cancelled) return
        const group = student.groupId
          ? groups.find((g) => g.id === student.groupId)
          : undefined
        const homeworkRows = submissions
          .map((sub) => {
            const hw = homeworkList.find((h) => h.id === sub.homeworkId)
            return hw ? { hw, sub } : null
          })
          .filter(Boolean) as Array<{ hw: HomeworkAssignment; sub: HomeworkSubmission }>
        homeworkRows.sort(
          (a, b) => new Date(b.hw.createdAt).getTime() - new Date(a.hw.createdAt).getTime(),
        )

        const payments = [...allPayments].sort(
          (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
        )

        setData({ progress, group, homeworkRows, payments })
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
  }, [student, open])

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-5xl flex w-[95vw] max-h-[90vh] flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b bg-gradient-to-br from-slate-50 to-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-lg font-bold text-white shadow-sm">
              {initials(student.name)}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl">{student.name}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-mono">
                  @{student.login}
                </span>
                {student.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {student.email}
                  </span>
                )}
                {student.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {student.phone}
                  </span>
                )}
                {data?.group && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {data.group.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(student.joinedAt).toLocaleDateString()}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <StudentIeltsProfileSection student={student} />

          {loading ? (
            <StudentDetailModalSkeleton />
          ) : !data ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Could not load student details
            </div>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Clock}
              label="Pending HW"
              value={String(data.progress.pendingHomework)}
              accent="bg-slate-100 text-slate-700"
            />
            <StatCard
              icon={Wallet}
              label="Unpaid"
              value={formatMoney(data.progress.unpaidTotal)}
              accent={data.progress.unpaidTotal > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}
              compact
            />
          </div>

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Homework history
            </h3>
            {data.homeworkRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No homework assigned yet
              </div>
            ) : (
              <ul className="space-y-2">
                {data.homeworkRows.map(({ hw, sub }) => {
                  const meta = SUBJECT_META[hw.subject]
                  const Icon = meta.icon
                  const resultBadge = homeworkResultBadge(sub)
                  const accuracy = submissionAccuracy(sub)
                  return (
                    <li
                      key={sub.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/5"
                        style={{ backgroundColor: meta.color }}
                      >
                        <Icon className="h-4 w-4 text-slate-900/80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{hw.title}</p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                              accuracy == null && "uppercase tracking-wide",
                              resultBadge.cls,
                            )}
                          >
                            {resultBadge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{hw.description}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due {new Date(hw.dueAt).toLocaleDateString()}
                          </span>
                          {accuracy != null && sub.attempt && (
                            <span className="inline-flex items-center gap-1 tabular-nums text-slate-600">
                              {sub.attempt.correctCount}/{sub.attempt.totalQuestions} correct
                            </span>
                          )}
                          {sub.feedback && (
                            <span className="italic text-slate-400 truncate">"{sub.feedback}"</span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <Separator />

          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Payment history
            </h3>
            {data.payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No payments recorded
              </div>
            ) : (
              <ul className="space-y-2">
                {data.payments.map((p) => {
                  const meta = PAYMENT_STATUS[p.status] ?? PAYMENT_STATUS.pending
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{p.periodLabel}</p>
                        <p className="text-xs text-slate-500">
                          Due {new Date(p.dueDate).toLocaleDateString()}
                          {p.paidDate && ` · Paid ${new Date(p.paidDate).toLocaleDateString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatMoney(p.amount)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            meta.cls,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {student.notes && (
            <>
              <Separator />
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Notes
                </h3>
                <p className="text-sm text-slate-700">{student.notes}</p>
              </section>
            </>
          )}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t bg-slate-50 px-6 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
          <Button
            variant="outline"
            onClick={() => setShowNotify(true)}
            className="gap-1.5"
          >
            <Bell className="h-4 w-4" />
            Send notification
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      <SendStudentNotificationDialog
        student={student}
        open={showNotify}
        onOpenChange={setShowNotify}
      />
    </Dialog>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  compact = false,
}: {
  icon: typeof Clock
  label: string
  value: string
  accent: string
  compact?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <div className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p
        className={cn(
          "mt-2 font-bold tabular-nums text-slate-900 break-words leading-tight",
          compact ? "text-sm" : "text-lg",
        )}
        title={value}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500 truncate">
        {label}
      </p>
    </div>
  )
}
