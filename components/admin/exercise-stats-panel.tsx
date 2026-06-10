"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Loader2,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { analyticsApi, type ExerciseAnalyticsReport } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type SortKey =
  | "title"
  | "assigned"
  | "completed"
  | "completionRate"
  | "cheatingRate"
  | "failureRate"
  | "practiceAttempts"
  | "practiceAccuracy"
type SortDir = "asc" | "desc"

function rateColor(pct: number | null): string {
  if (pct == null) return "text-slate-400"
  if (pct >= 80) return "text-emerald-700"
  if (pct >= 60) return "text-sky-700"
  if (pct >= 40) return "text-amber-700"
  return "text-rose-700"
}

function rateBadge(pct: number | null): string {
  if (pct == null) return "bg-slate-100 text-slate-500"
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function rateBar(pct: number | null): string {
  if (pct == null) return "bg-slate-300"
  if (pct >= 80) return "bg-emerald-500"
  if (pct >= 60) return "bg-sky-500"
  if (pct >= 40) return "bg-amber-500"
  return "bg-rose-500"
}

const TYPE_LABEL: Record<string, string> = {
  "fill-in-the-blank": "Fill in the gaps",
  "multiple-choice": "Multiple choice",
  matching: "Matching",
  "word-formation": "Word formation",
  "sentence-transformation": "Sentence transformation",
  "true-false": "True / False",
}

interface ExerciseStatsPanelProps {
  variant?: "dialog" | "page"
}

export default function ExerciseStatsPanel({ variant = "dialog" }: ExerciseStatsPanelProps) {
  const [data, setData] = useState<ExerciseAnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState("")
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>("assigned")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    analyticsApi
      .exerciseStats()
      .then((res) => {
        if (!cancelled) {
          setData(res)
          if (res.topics[0]) {
            setOpenTopics({ [res.topics[0].topic]: true })
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredExercises = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    let rows = data.exercises
    if (q) {
      rows = rows.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          (e.topic ?? "").toLowerCase().includes(q),
      )
    }
    const dir = sortDir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? (sortKey === "title" ? a.title : -1)
      const bv = b[sortKey] ?? (sortKey === "title" ? b.title : -1)
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir
      }
      return ((av as number) - (bv as number)) * dir
    })
  }, [data, query, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading statistics…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-800">
        Could not load exercise statistics. Try again later.
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Assignments" value={String(summary.totalAssigned)} />
        <SummaryCard
          label="Completed"
          value={`${summary.completionRate ?? 0}%`}
          sub={`${summary.totalCompleted} done`}
          accent={rateBadge(summary.completionRate)}
        />
        <SummaryCard
          label="Cheating"
          value={`${summary.cheatingRate ?? 0}%`}
          sub={`${summary.totalCheating} flagged`}
          accent="bg-rose-100 text-rose-800"
        />
        <SummaryCard
          label="Failed"
          value={`${summary.failureRate ?? 0}%`}
          sub={`${summary.totalFailed} total`}
          accent="bg-red-100 text-red-800"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {summary.weakestExercise ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
            <TrendingDown className="h-4 w-4 shrink-0 text-rose-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                Lowest completion
              </p>
              <p className="truncate text-sm font-medium text-slate-900">
                {summary.weakestExercise.title} · {summary.weakestExercise.completionRate ?? 0}%
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Not enough assignment data yet for completion insights.
          </div>
        )}
        {summary.mostCheatingExercise ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Highest cheating rate
              </p>
              <p className="truncate text-sm font-medium text-slate-900">
                {summary.mostCheatingExercise.title} · {summary.mostCheatingExercise.cheatingRate ?? 0}%
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Integrity
              </p>
              <p className="text-sm font-medium text-slate-900">No cheating incidents recorded</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercise or topic…"
            className="pl-8"
          />
        </div>
        <span className="text-xs text-slate-500">
          {summary.exercisesTracked} exercises · {summary.totalPracticeAttempts} practice attempts
        </span>
      </div>

      {variant === "page" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Th sortKey="title" current={sortKey} dir={sortDir} onSort={toggleSort}>
                  Exercise
                </Th>
                <Th sortKey="assigned" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Assigned
                </Th>
                <Th sortKey="completed" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Done
                </Th>
                <Th sortKey="completionRate" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Completion
                </Th>
                <Th sortKey="cheatingRate" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Cheating
                </Th>
                <Th sortKey="failureRate" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Failed
                </Th>
                <Th sortKey="practiceAttempts" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Practice
                </Th>
                <Th sortKey="practiceAccuracy" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">
                  Accuracy
                </Th>
              </tr>
            </thead>
            <tbody>
              {filteredExercises.map((ex) => (
                <tr key={ex.slug} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-900">{ex.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {ex.topic?.replace(/-/g, " ") ?? ex.subject}
                      {ex.type ? ` · ${TYPE_LABEL[ex.type] ?? ex.type}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ex.assigned}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{ex.completed}</td>
                  <td className="px-3 py-2.5 text-right">
                    <RateCell value={ex.completionRate} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RateCell value={ex.cheatingRate} danger />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RateCell value={ex.failureRate} danger />
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                    {ex.practiceAttempts}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <RateCell value={ex.practiceAccuracy} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExercises.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No exercises match your search.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {data.topics.map((topic) => {
            const isOpen = !!openTopics[topic.topic]
            return (
              <div key={topic.topic} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenTopics((p) => ({ ...p, [topic.topic]: !p[topic.topic] }))}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold capitalize text-slate-900">
                        {topic.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                          rateBadge(topic.completionRate),
                        )}
                      >
                        {topic.completionRate ?? 0}% done
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full rounded-full", rateBar(topic.completionRate))}
                        style={{ width: `${topic.completionRate ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                      <span>{topic.assigned} assigned</span>
                      <span>{topic.completed} completed</span>
                      {topic.cheating > 0 && (
                        <span className="inline-flex items-center gap-1 text-rose-600">
                          <ShieldAlert className="h-3 w-3" />
                          {topic.cheating} cheating ({topic.cheatingRate ?? 0}%)
                        </span>
                      )}
                      {topic.failed > 0 && (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          {topic.failed} failed
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                      {topic.exercises
                        .filter(
                          (ex) =>
                            !query.trim() ||
                            ex.title.toLowerCase().includes(query.toLowerCase()) ||
                            ex.slug.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((ex) => (
                          <ExerciseRow key={ex.slug} ex={ex} />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {data.topics.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              No homework assignments or practice attempts recorded yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ExerciseRow({ ex }: { ex: ExerciseAnalyticsReport["exercises"][number] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{ex.title}</p>
          <p className="text-[11px] text-slate-500">
            {ex.type ? (TYPE_LABEL[ex.type] ?? ex.type) : ex.subject}
            {ex.level ? ` · ${ex.level}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MiniBadge label="Assigned" value={ex.assigned} />
          <MiniBadge label="Done" value={`${ex.completionRate ?? 0}%`} accent={rateBadge(ex.completionRate)} />
          {ex.cheating > 0 && (
            <MiniBadge
              label="Cheating"
              value={`${ex.cheatingRate ?? 0}%`}
              accent="bg-rose-100 text-rose-800"
            />
          )}
          {ex.practiceAttempts > 0 && (
            <MiniBadge
              label="Practice"
              value={`${ex.practiceAccuracy ?? 0}%`}
              accent={rateBadge(ex.practiceAccuracy)}
            />
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-600 sm:grid-cols-4">
        <span>{ex.completed} completed</span>
        <span>{ex.pending} pending</span>
        <span>{ex.inProgress + ex.paused} in progress</span>
        <span>{ex.practiceAttempts} practice runs</span>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p
        className={cn(
          "mx-auto w-fit rounded-full px-2 py-0.5 text-base font-bold tabular-nums",
          accent ?? "text-slate-900",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
    </div>
  )
}

function MiniBadge({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        accent ?? "bg-slate-100 text-slate-700",
      )}
    >
      <span className="font-normal text-slate-500">{label}</span>
      {value}
    </span>
  )
}

function RateCell({ value, danger }: { value: number | null; danger?: boolean }) {
  if (value == null) return <span className="text-slate-400">—</span>
  return (
    <span className={cn("font-semibold tabular-nums", danger ? "text-rose-700" : rateColor(value))}>
      {value}%
    </span>
  )
}

function Th({
  children,
  sortKey,
  current,
  dir,
  onSort,
  align = "left",
}: {
  children: React.ReactNode
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: "left" | "right"
}) {
  const active = current === sortKey
  return (
    <th className={cn("px-3 py-2.5", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-slate-800",
          active && "text-slate-900",
        )}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  )
}
