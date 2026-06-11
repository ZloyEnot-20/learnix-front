"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  BookMarked,
  Headphones,
  PenTool,
  Mic,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  History,
  Infinity,
  ListTodo,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"
type Status = "pending" | "in_progress" | "completed"

interface HomeworkItem {
  id: string
  subject: Subject
  title: string
  description: string
  dueAt: string
  status: Status
  /** Countdown limit in minutes; undefined = unlimited. */
  timeLimitMinutes?: number
  /** When the work was submitted/graded — used to group the History tab. */
  completedAt?: string
  failedCheating?: boolean
  /** Optional URL — if set, Start/Continue buttons link to it. */
  href?: string
}

const SUBJECT_META: Record<Subject, { icon: typeof BookOpen; color: string }> = {
  reading: { icon: BookOpen, color: "#c1bffd" },
  listening: { icon: Headphones, color: "#ffcc3e" },
  writing: { icon: PenTool, color: "#a7e237" },
  speaking: { icon: Mic, color: "#9fcffb" },
  grammar: { icon: GraduationCap, color: "#fcd5a4" },
  vocabulary: { icon: BookMarked, color: "#d8b4fe" },
}

const STATUS_META: Record<
  Status,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", className: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
}

const MOCK_HOMEWORK: HomeworkItem[] = [
  {
    id: "hw-gr1",
    subject: "grammar",
    title: "Verb To Be — Am, Is, Are (Easy)",
    description: "Practise choosing the correct present form of 'to be' (am, is, are) with clear subjects.",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: "pending",
    timeLimitMinutes: undefined,
    href: "/exercises/verb-to-be/verb-to-be-positive-easy",
  },
  {
    id: "hw-gr2",
    subject: "grammar",
    title: "Verb To Be — Am, Is, Are (Intermediate)",
    description:
      "Practise the verb 'to be' with proper nouns, compound subjects, and varied contexts.",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "in_progress",
    timeLimitMinutes: 15,
    href: "/exercises/verb-to-be/verb-to-be-positive-intermediate",
  },
  {
    id: "hw-gr3",
    subject: "grammar",
    title: "There Is / There Are Questions",
    description:
      "Practise yes-no questions with singular, plural, and uncountable nouns.",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: "pending",
    timeLimitMinutes: undefined,
    href: "/exercises/there-is-there-are/there-is-there-are-questions",
  },
  {
    id: "hw-gr4",
    subject: "grammar",
    title: "There Is / There Are Statements",
    description: "Practise statements with countable and uncountable nouns.",
    dueAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    status: "completed",
    timeLimitMinutes: 10,
    href: "/exercises/there-is-there-are/there-is-there-are-statements",
  },
  {
    id: "hw-r1",
    subject: "reading",
    title: "Cambridge 17 — Reading Passage 3",
    description: "Read the passage and answer questions 27–40 about global trade.",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    status: "pending",
    timeLimitMinutes: 40,
  },
]

function formatTimeLimit(minutes?: number): { label: string; Icon: typeof Timer } {
  if (minutes == null || minutes <= 0) {
    return { label: "Unlimited", Icon: Infinity }
  }
  return { label: `${minutes} min limit`, Icon: Timer }
}

/**
 * Human label for a completed item's date bucket: "Today", "Yesterday", or the
 * formatted date (e.g. "03.09.2024") — mirroring the notifications panel.
 */
function dateGroupLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return "Today"
  if (sameDay(d, yesterday)) return "Yesterday"
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}.${mm}.${d.getFullYear()}`
}

interface HistoryGroup {
  label: string
  items: HomeworkItem[]
}

/** Group completed items into date buckets, newest first. */
function groupByDate(items: HomeworkItem[]): HistoryGroup[] {
  const sorted = [...items].sort((a, b) => {
    const ta = new Date(a.completedAt ?? a.dueAt).getTime()
    const tb = new Date(b.completedAt ?? b.dueAt).getTime()
    return tb - ta
  })
  const groups: HistoryGroup[] = []
  for (const item of sorted) {
    const label = dateGroupLabel(item.completedAt ?? item.dueAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

function formatDue(iso: string, status: Status): { label: string; overdue: boolean } {
  if (status === "completed") {
    return { label: "Submitted", overdue: false }
  }
  const due = new Date(iso).getTime()
  const diff = due - Date.now()
  const overdue = diff < 0
  const abs = Math.abs(diff)
  const minutes = Math.floor(abs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let suffix: string
  if (days >= 1) suffix = `${days}d`
  else if (hours >= 1) suffix = `${hours}h`
  else suffix = `${Math.max(1, minutes)}m`

  return {
    label: overdue ? `Overdue by ${suffix}` : `Due in ${suffix}`,
    overdue,
  }
}

function HomeworkCard({ hw }: { hw: HomeworkItem }) {
  const meta = SUBJECT_META[hw.subject]
  const Icon = meta.icon
  const due = formatDue(hw.dueAt, hw.status)
  const status = hw.failedCheating
    ? { label: "Failed", className: "bg-red-100 text-red-800" }
    : STATUS_META[hw.status]
  const isCompleted = hw.status === "completed"
  const timeLimit = formatTimeLimit(hw.timeLimitMinutes)
  const TimeLimitIcon = timeLimit.Icon
  // For completed work, show when it was finished instead of the due date.
  const completedLabel =
    isCompleted && hw.completedAt
      ? `Completed ${new Date(hw.completedAt).toLocaleDateString()}`
      : null

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-4",
        isCompleted && "opacity-80",
      )}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5"
        style={{ backgroundColor: meta.color }}
      >
        <Icon className="h-6 w-6 text-slate-900/80" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={cn(
              "font-semibold text-slate-900",
              isCompleted && "line-through decoration-slate-300",
            )}
          >
            {hw.title}
          </h3>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{hw.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              due.overdue && "font-semibold text-[#C8102E]",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {completedLabel ?? due.label}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              hw.timeLimitMinutes != null &&
                hw.timeLimitMinutes > 0 &&
                "font-medium text-amber-800",
            )}
          >
            <TimeLimitIcon className="h-3.5 w-3.5" />
            {timeLimit.label}
          </span>
          <span className="capitalize text-slate-400">{hw.subject}</span>
        </div>
      </div>

      <div className="shrink-0">
        {isCompleted ? (
          hw.href ? (
            <Link href={hw.href}>
              <Button
                variant="ghost"
                size="sm"
                className={hw.failedCheating ? "text-red-700" : "text-emerald-700"}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                View
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={hw.failedCheating ? "text-red-700" : "text-emerald-700"}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              View
            </Button>
          )
        ) : hw.href ? (
          <Link href={hw.href}>
            <Button size="sm" className="bg-[#C8102E] hover:bg-[#A00D25]">
              {hw.status === "in_progress" ? "Continue" : "Start"}
            </Button>
          </Link>
        ) : (
          <Button size="sm" className="bg-[#C8102E] hover:bg-[#A00D25]">
            {hw.status === "in_progress" ? "Continue" : "Start"}
          </Button>
        )}
      </div>
    </li>
  )
}

export function HomeworkSection({ items = MOCK_HOMEWORK }: { items?: HomeworkItem[] }) {
  const [tab, setTab] = useState<"active" | "history">("active")

  const active = useMemo(
    () => items.filter((i) => i.status !== "completed"),
    [items],
  )
  const completed = useMemo(
    () => items.filter((i) => i.status === "completed"),
    [items],
  )
  const historyGroups = useMemo(() => groupByDate(completed), [completed])

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Homework</CardTitle>
            <CardDescription>
              {tab === "active" ? "Tasks assigned by your tutor" : "Homework history"}
            </CardDescription>
          </div>
          {tab === "active" && active.length > 0 && (
            <span className="rounded-full bg-[#C8102E]/10 px-3 py-1 text-xs font-semibold text-[#C8102E]">
              {active.length} pending
            </span>
          )}
        </div>

        <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "active"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <ListTodo className="h-4 w-4" />
            Active
            {active.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-700">
                {active.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "history"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <History className="h-4 w-4" />
            History
            {completed.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-700">
                {completed.length}
              </span>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {tab === "active" ? (
          active.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <div className="rounded-full bg-slate-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">All caught up</p>
              <p className="text-sm text-slate-500">
                You have no active homework. Check the History tab for completed tasks.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {active.map((hw) => (
                <HomeworkCard key={hw.id} hw={hw} />
              ))}
            </ul>
          )
        ) : completed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <History className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-900">No completed homework yet</p>
            <p className="text-sm text-slate-500">
              Finished tasks will be archived here, grouped by date.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {historyGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
                <ul className="space-y-3">
                  {group.items.map((hw) => (
                    <HomeworkCard key={hw.id} hw={hw} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
