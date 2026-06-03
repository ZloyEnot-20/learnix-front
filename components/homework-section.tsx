"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Headphones,
  PenTool,
  Mic,
  Clock,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Infinity,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar"
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
  /** Optional URL — if set, Start/Continue buttons link to it. */
  href?: string
}

const SUBJECT_META: Record<Subject, { icon: typeof BookOpen; color: string }> = {
  reading: { icon: BookOpen, color: "#c1bffd" },
  listening: { icon: Headphones, color: "#ffcc3e" },
  writing: { icon: PenTool, color: "#a7e237" },
  speaking: { icon: Mic, color: "#9fcffb" },
  grammar: { icon: GraduationCap, color: "#fcd5a4" },
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

export function HomeworkSection({ items = MOCK_HOMEWORK }: { items?: HomeworkItem[] }) {
  const pendingCount = items.filter((i) => i.status !== "completed").length

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Homework</CardTitle>
            <CardDescription>Tasks assigned by your tutor</CardDescription>
          </div>
          {pendingCount > 0 && (
            <span className="rounded-full bg-[#C8102E]/10 px-3 py-1 text-xs font-semibold text-[#C8102E]">
              {pendingCount} pending
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="rounded-full bg-slate-100 p-3">
              <CheckCircle2 className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-900">No homework yet</p>
            <p className="text-sm text-slate-500">
              When your tutor assigns a task it will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((hw) => {
              const meta = SUBJECT_META[hw.subject]
              const Icon = meta.icon
              const due = formatDue(hw.dueAt, hw.status)
              const status = STATUS_META[hw.status]
              const isCompleted = hw.status === "completed"
              const timeLimit = formatTimeLimit(hw.timeLimitMinutes)
              const TimeLimitIcon = timeLimit.Icon

              return (
                <li
                  key={hw.id}
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
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                      {hw.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          due.overdue && "font-semibold text-[#C8102E]",
                        )}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        {due.label}
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
                          <Button variant="ghost" size="sm" className="text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            View
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-emerald-700">
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
                      <Button
                        size="sm"
                        className="bg-[#C8102E] hover:bg-[#A00D25]"
                      >
                        {hw.status === "in_progress" ? "Continue" : "Start"}
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
