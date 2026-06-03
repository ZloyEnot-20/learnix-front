"use client"

import { useMemo } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Flame,
  Headphones,
  LineChart as LineChartIcon,
  Mic,
  PenTool,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RecentMistake {
  id: string
  topic: string
  question: string
  yourAnswer: string
  correct: string
  daysAgo: number
}

interface UpcomingHw {
  id: string
  title: string
  subject: "reading" | "listening" | "writing" | "speaking" | "grammar"
  dueInDays: number
}

const SKILLS = [
  { key: "reading", label: "Reading", color: "#c1bffd", icon: BookOpen },
  { key: "listening", label: "Listening", color: "#ffcc3e", icon: Headphones },
  { key: "writing", label: "Writing", color: "#a7e237", icon: PenTool },
  { key: "speaking", label: "Speaking", color: "#9fcffb", icon: Mic },
] as const

const HW_PIE_COLORS: Record<string, string> = {
  Completed: "#34d399",
  "In progress": "#fbbf24",
  Pending: "#cbd5e1",
}

const MOCK_BAND_PROGRESS = [
  { label: "Jan", band: 6.0 },
  { label: "Feb", band: 6.5 },
  { label: "Mar", band: 6.5 },
  { label: "Apr", band: 7.0 },
  { label: "May", band: 7.5 },
  { label: "Jun", band: 7.5 },
]

const MOCK_SKILL_BANDS = [
  { name: "Reading", band: 7.5, color: "#c1bffd" },
  { name: "Listening", band: 7.0, color: "#ffcc3e" },
  { name: "Writing", band: 6.5, color: "#a7e237" },
  { name: "Speaking", band: 7.0, color: "#9fcffb" },
]

const MOCK_HW_STATUS = [
  { name: "Completed", value: 14 },
  { name: "In progress", value: 2 },
  { name: "Pending", value: 3 },
]

const MOCK_UPCOMING: UpcomingHw[] = [
  { id: "u1", title: "Verb To Be — Intermediate", subject: "grammar", dueInDays: 1 },
  { id: "u2", title: "Cambridge 17 — Reading Passage 3", subject: "reading", dueInDays: 2 },
  { id: "u3", title: "Task 2 essay — Technology in education", subject: "writing", dueInDays: 3 },
  { id: "u4", title: "Speaking Part 2 — A memorable journey", subject: "speaking", dueInDays: 5 },
]

const MOCK_RECENT_MISTAKES: RecentMistake[] = [
  {
    id: "m1",
    topic: "Verb To Be",
    question: "Tom and Jerry _____ best friends.",
    yourAnswer: "is",
    correct: "are",
    daysAgo: 1,
  },
  {
    id: "m2",
    topic: "Reading · True/False/NG",
    question: "All researchers agree on the cause.",
    yourAnswer: "True",
    correct: "Not Given",
    daysAgo: 2,
  },
  {
    id: "m3",
    topic: "Listening · Numbers",
    question: "Missing number in the lecture",
    yourAnswer: "14",
    correct: "40",
    daysAgo: 3,
  },
  {
    id: "m4",
    topic: "Writing · Subject–verb",
    question: "The data ___ show a clear trend.",
    yourAnswer: "shows",
    correct: "show",
    daysAgo: 4,
  },
]

interface StudentOverviewProps {
  studentName: string
  /** Optional override of the band‑progression series. */
  bandProgress?: Array<{ label: string; band: number }>
  /** Optional override of the per‑skill bands. */
  skillBands?: Array<{ name: string; band: number; color: string }>
}

export function StudentOverview({
  studentName,
  bandProgress = MOCK_BAND_PROGRESS,
  skillBands = MOCK_SKILL_BANDS,
}: StudentOverviewProps) {
  const currentBand = bandProgress[bandProgress.length - 1]?.band ?? null
  const previousBand = bandProgress[bandProgress.length - 2]?.band ?? null
  const delta =
    currentBand != null && previousBand != null
      ? Math.round((currentBand - previousBand) * 10) / 10
      : 0

  const homeworkPie = useMemo(
    () =>
      MOCK_HW_STATUS.map((d) => ({
        ...d,
        color: HW_PIE_COLORS[d.name] ?? "#cbd5e1",
      })).filter((d) => d.value > 0),
    [],
  )

  const totalHw = MOCK_HW_STATUS.reduce((a, b) => a + b.value, 0)
  const completedHw = MOCK_HW_STATUS.find((d) => d.name === "Completed")?.value ?? 0
  const completionPct = totalHw ? Math.round((completedHw / totalHw) * 100) : 0
  const accuracyPct = currentBand != null
    ? Math.round((currentBand / 9) * 100)
    : null
  const pending = MOCK_HW_STATUS.find((d) => d.name === "Pending")?.value ?? 0
  const studyStreak = 12

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Kpi
          icon={Award}
          label="Current band"
          value={currentBand != null ? currentBand.toFixed(1) : "—"}
          sub={
            delta === 0
              ? "no change this month"
              : delta > 0
                ? `+${delta} from last month`
                : `${delta} from last month`
          }
          accent="bg-violet-50 text-violet-700"
        />
        <Kpi
          icon={Target}
          label="Accuracy"
          value={accuracyPct != null ? `${accuracyPct}%` : "—"}
          sub="across graded work"
          accent="bg-emerald-50 text-emerald-700"
        />
        <Kpi
          icon={ClipboardList}
          label="Homework done"
          value={`${completedHw}/${totalHw}`}
          sub={`${completionPct}% completion rate`}
          accent="bg-sky-50 text-sky-700"
        />
        <Kpi
          icon={Clock}
          label="Pending tasks"
          value={pending}
          sub={pending === 0 ? "all caught up" : "open assignments"}
          accent={pending > 0 ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}
        />
        <Kpi
          icon={Flame}
          label="Study streak"
          value={`${studyStreak}d`}
          sub="keep it going"
          accent="bg-rose-50 text-rose-700"
        />
      </div>

      {/* Pie + Skill breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-sky-600" />
                  Homework status
                </CardTitle>
                <CardDescription>{totalHw} assignments tracked</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-xs">
                {completionPct}% done
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-6">
              <div className="relative h-[180px]">
                {homeworkPie.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Nothing yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={homeworkPie}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {homeworkPie.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">
                    Completed
                  </p>
                  <p className="text-base font-bold tabular-nums text-slate-900">
                    {completionPct}%
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {homeworkPie.map((d) => (
                  <LegendRow
                    key={d.name}
                    color={d.color}
                    label={d.name}
                    value={String(d.value)}
                  />
                ))}
                <div className="my-2 h-px bg-slate-100" />
                <LegendRow
                  color="#0f172a"
                  label="Total"
                  value={String(totalHw)}
                  bold
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Skill breakdown
                </CardTitle>
                <CardDescription>Band by section</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                {currentBand != null ? `${currentBand.toFixed(1)} avg` : "—"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skillBands} barSize={40} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[0, 9]}
                  ticks={[0, 3, 6, 9]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  }}
                  formatter={(value: number) => [value.toFixed(1), "Band"]}
                />
                <Bar dataKey="band" radius={[8, 8, 0, 0]}>
                  {skillBands.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {skillBands.map((s) => {
                const Icon = SKILLS.find((sk) => sk.label === s.name)?.icon ?? Sparkles
                return (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md ring-1 ring-black/5"
                        style={{ backgroundColor: s.color }}
                      >
                        <Icon className="h-3 w-3 text-slate-900/80" />
                      </span>
                      {s.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {s.band.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score progress + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="h-5 w-5 text-slate-700" />
                  Band progress
                </CardTitle>
                <CardDescription>
                  {studentName.split(" ")[0]} · last {bandProgress.length} months
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  delta > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : delta < 0
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-700",
                )}
              >
                {delta > 0 ? "+" : ""}{delta} band
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={bandProgress} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  domain={[4, 9]}
                  ticks={[4, 5, 6, 7, 8, 9]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  }}
                  formatter={(value: number) => [value.toFixed(1), "Band"]}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  stroke="#a4e64e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#a4e64e", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#16a34a" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              Upcoming
            </CardTitle>
            <CardDescription>Next homework deadlines</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {MOCK_UPCOMING.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming deadlines.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {MOCK_UPCOMING.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {h.title}
                      </p>
                      <p className="truncate text-xs capitalize text-slate-500">
                        {h.subject}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "text-[11px] font-semibold",
                          h.dueInDays <= 1
                            ? "text-rose-600"
                            : h.dueInDays <= 3
                              ? "text-amber-600"
                              : "text-slate-500",
                        )}
                      >
                        {h.dueInDays === 0
                          ? "today"
                          : h.dueInDays === 1
                            ? "tomorrow"
                            : `in ${h.dueInDays}d`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent mistakes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600" />
                Recent mistakes
              </CardTitle>
              <CardDescription>
                Revisit these to push your band higher
              </CardDescription>
            </div>
            <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-xs">
              {MOCK_RECENT_MISTAKES.length} to review
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {MOCK_RECENT_MISTAKES.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              No recent mistakes — strong work!
            </div>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_RECENT_MISTAKES.map((m) => (
                <li
                  key={m.id}
                  className="rounded-xl border border-rose-100 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                      {m.topic}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {m.daysAgo === 0
                        ? "today"
                        : m.daysAgo === 1
                          ? "1d ago"
                          : `${m.daysAgo}d ago`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900">{m.question}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <XCircle className="h-3 w-3" />
                      Your answer:{" "}
                      <span className="font-semibold">{m.yourAnswer}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Correct:{" "}
                      <span className="font-semibold">{m.correct}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Award
  label: string
  value: number | string
  sub?: string
  accent: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {sub && (
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{sub}</p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  )
}

function LegendRow({
  color,
  label,
  value,
  bold,
}: {
  color: string
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span className="text-slate-600">{label}</span>
      </div>
      <span
        className={cn(
          "tabular-nums text-slate-900",
          bold ? "font-bold" : "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  )
}
