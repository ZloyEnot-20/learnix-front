"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts"
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Coins,
  Headphones,
  Layers,
  Mic,
  PenTool,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import {
  ensureSeeded,
  listGroups,
  listHomework,
  listPayments,
  listStudents,
  listSubmissions,
  type Group,
  type HomeworkAssignment,
  type Payment,
  type Student,
} from "@/lib/admin-storage"
import { cn, formatMoney } from "@/lib/utils"

interface AdminTestRecord {
  testId: string
  type: "reading" | "listening" | "writing" | "speaking"
  title: string
}

const TEST_TYPES = [
  { key: "reading", label: "Reading", Icon: BookOpen, color: "#c1bffd" },
  { key: "listening", label: "Listening", Icon: Headphones, color: "#ffcc3e" },
  { key: "writing", label: "Writing", Icon: PenTool, color: "#a7e237" },
  { key: "speaking", label: "Speaking", Icon: Mic, color: "#9fcffb" },
] as const

type TestType = (typeof TEST_TYPES)[number]["key"]

interface Props {
  refreshKey?: number
  onSelectTab?: (id: string) => void
  /** Accent colour for the role (teacher → violet, admin → red). */
  accent?: "rose" | "violet"
}

export default function OverviewDashboard({
  refreshKey = 0,
  onSelectTab,
  accent = "rose",
}: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [homework, setHomework] = useState<HomeworkAssignment[]>([])
  const [submissions, setSubmissions] = useState<ReturnType<typeof listSubmissions>>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tests, setTests] = useState<AdminTestRecord[]>([])

  useEffect(() => {
    ensureSeeded()
    setGroups(listGroups())
    setStudents(listStudents())
    setHomework(listHomework())
    setSubmissions(listSubmissions())
    setPayments(listPayments())

    try {
      const raw = JSON.parse(localStorage.getItem("adminTests") || "{}") as Record<string, AdminTestRecord>
      setTests(Object.values(raw))
    } catch {
      setTests([])
    }
  }, [refreshKey])

  const now = Date.now()
  const day = 1000 * 60 * 60 * 24

  const accentRing = accent === "violet" ? "ring-violet-200" : "ring-rose-200"
  const accentChip = accent === "violet" ? "bg-violet-50 text-violet-700" : "bg-rose-50 text-rose-700"

  const testStats = useMemo(() => {
    const counts: Record<TestType, number> = { reading: 0, listening: 0, writing: 0, speaking: 0 }
    for (const t of tests) {
      if (t && (t.type as TestType) in counts) counts[t.type as TestType] += 1
    }
    return counts
  }, [tests])
  const totalTests = Object.values(testStats).reduce((a, b) => a + b, 0)

  const studentStats = useMemo(() => {
    const total = students.length
    const inGroup = students.filter((s) => Boolean(s.groupId)).length
    const newThisMonth = students.filter((s) => {
      const t = new Date(s.joinedAt).getTime()
      return now - t < day * 30
    }).length
    return { total, inGroup, unassigned: total - inGroup, newThisMonth }
  }, [students, now])

  const groupStats = useMemo(() => {
    const total = groups.length
    const avg = total ? Math.round(((students.filter((s) => s.groupId).length / total) * 10)) / 10 : 0
    return { total, avgPerGroup: avg }
  }, [groups, students])

  const homeworkStats = useMemo(() => {
    const total = homework.length
    const overdue = homework.filter((h) => new Date(h.dueAt).getTime() < now).length
    const upcoming = homework
      .filter((h) => new Date(h.dueAt).getTime() >= now)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    return { total, overdue, upcoming }
  }, [homework, now])

  const submissionStats = useMemo(() => {
    const buckets = { pending: 0, in_progress: 0, submitted: 0, graded: 0 }
    let scoreSum = 0
    let scoreCount = 0
    for (const s of submissions) {
      buckets[s.status] += 1
      if (typeof s.score === "number") {
        scoreSum += s.score
        scoreCount += 1
      }
    }
    const total = submissions.length
    const completionRate = total ? Math.round(((buckets.submitted + buckets.graded) / total) * 100) : 0
    const avgScore = scoreCount ? Math.round((scoreSum / scoreCount) * 10) / 10 : null
    const needGrading = buckets.submitted
    return { ...buckets, total, completionRate, avgScore, needGrading }
  }, [submissions])

  const paymentStats = useMemo(() => {
    let expected = 0
    let collected = 0
    let pending = 0
    let overdue = 0
    let collectedThisMonth = 0

    const monthAgo = now - day * 30
    for (const p of payments) {
      expected += p.amount
      if (p.status === "paid") {
        collected += p.amount
        if (p.paidDate && new Date(p.paidDate).getTime() >= monthAgo) {
          collectedThisMonth += p.amount
        }
      } else if (p.status === "overdue") {
        overdue += p.amount
      } else {
        pending += p.amount
      }
    }
    const rate = expected ? Math.round((collected / expected) * 100) : 0
    return { expected, collected, pending, overdue, collectedThisMonth, rate }
  }, [payments, now])

  const studentById = useMemo(() => {
    const map = new Map<string, Student>()
    students.forEach((s) => map.set(s.id, s))
    return map
  }, [students])
  const groupById = useMemo(() => {
    const map = new Map<string, Group>()
    groups.forEach((g) => map.set(g.id, g))
    return map
  }, [groups])

  const overduePayments = useMemo(() => {
    return payments
      .filter((p) => p.status === "overdue")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [payments])

  const upcomingHomework = useMemo(() => homeworkStats.upcoming.slice(0, 5), [homeworkStats])

  const testsChartData = TEST_TYPES.map((t) => ({
    name: t.label,
    count: testStats[t.key],
    color: t.color,
  }))

  const submissionPieData = [
    { name: "Pending", value: submissionStats.pending, color: "#cbd5e1" },
    { name: "In progress", value: submissionStats.in_progress, color: "#fbbf24" },
    { name: "Submitted", value: submissionStats.submitted, color: "#60a5fa" },
    { name: "Graded", value: submissionStats.graded, color: "#34d399" },
  ].filter((d) => d.value > 0)

  const paymentPieData = [
    { name: "Collected", value: paymentStats.collected, color: "#34d399" },
    { name: "Pending", value: paymentStats.pending, color: "#fbbf24" },
    { name: "Overdue", value: paymentStats.overdue, color: "#fb7185" },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Kpi
          icon={Users}
          label="Students"
          value={studentStats.total}
          sub={`${studentStats.inGroup} in groups · +${studentStats.newThisMonth} this month`}
          accent="bg-blue-50 text-blue-700"
          onClick={() => onSelectTab?.("students")}
        />
        <Kpi
          icon={Layers}
          label="Active groups"
          value={groupStats.total}
          sub={`avg ${groupStats.avgPerGroup} students / group`}
          accent="bg-violet-50 text-violet-700"
          onClick={() => onSelectTab?.("groups")}
        />
        <Kpi
          icon={Wallet}
          label="Collected (30d)"
          value={formatMoney(paymentStats.collectedThisMonth)}
          sub={`${paymentStats.rate}% collection rate`}
          accent="bg-emerald-50 text-emerald-700"
          onClick={() => onSelectTab?.("finance")}
        />
        <Kpi
          icon={AlertTriangle}
          label="Overdue"
          value={formatMoney(paymentStats.overdue)}
          sub={paymentStats.overdue > 0 ? "needs attention" : "all caught up"}
          accent={paymentStats.overdue > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}
          onClick={() => onSelectTab?.("finance")}
        />
        <Kpi
          icon={ClipboardCheck}
          label="To grade"
          value={submissionStats.needGrading}
          sub={
            submissionStats.avgScore !== null
              ? `avg ${submissionStats.avgScore} · ${submissionStats.completionRate}% completion`
              : `${submissionStats.completionRate}% completion`
          }
          accent="bg-amber-50 text-amber-700"
          onClick={() => onSelectTab?.("homework")}
        />
      </div>

      {/* Financial + Homework status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-emerald-600" />
                  Payments breakdown
                </CardTitle>
                <CardDescription>
                  {formatMoney(paymentStats.expected)} expected across all groups
                </CardDescription>
              </div>
              <Badge variant="secondary" className={cn("text-xs", accentChip)}>
                {paymentStats.rate}% collected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-6">
              <div className="relative h-[180px]">
                {paymentPieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No payments yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {paymentPieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatMoney(value)}
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Collected</p>
                  <p className="text-base font-bold tabular-nums text-slate-900">
                    {paymentStats.rate}%
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <LegendRow color="#34d399" label="Collected" value={formatMoney(paymentStats.collected)} />
                <LegendRow color="#fbbf24" label="Pending" value={formatMoney(paymentStats.pending)} />
                <LegendRow color="#fb7185" label="Overdue" value={formatMoney(paymentStats.overdue)} />
                <div className="my-2 h-px bg-slate-100" />
                <LegendRow
                  color="#0f172a"
                  label="Expected total"
                  value={formatMoney(paymentStats.expected)}
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
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  Homework status
                </CardTitle>
                <CardDescription>
                  {submissionStats.total} submissions tracked
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                {submissionStats.completionRate}% done
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-6">
              <div className="relative h-[180px]">
                {submissionPieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No submissions yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={submissionPieData}
                        dataKey="value"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {submissionPieData.map((d) => (
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Avg score</p>
                  <p className="text-base font-bold tabular-nums text-slate-900">
                    {submissionStats.avgScore !== null ? submissionStats.avgScore : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <LegendRow color="#cbd5e1" label="Pending" value={String(submissionStats.pending)} />
                <LegendRow color="#fbbf24" label="In progress" value={String(submissionStats.in_progress)} />
                <LegendRow color="#60a5fa" label="Submitted" value={String(submissionStats.submitted)} />
                <LegendRow color="#34d399" label="Graded" value={String(submissionStats.graded)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists: deadlines & overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              Upcoming deadlines
            </CardTitle>
            <CardDescription>
              Next homework assignments due
              {homeworkStats.overdue > 0 && (
                <span className="ml-1 text-rose-600">
                  · {homeworkStats.overdue} overdue
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingHomework.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming deadlines.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcomingHomework.map((h) => {
                  const group = groupById.get(h.groupId)
                  const due = new Date(h.dueAt)
                  const daysLeft = Math.max(0, Math.ceil((due.getTime() - now) / day))
                  return (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{h.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {group?.name ?? "Unknown group"} · {h.subject}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-slate-900">
                          {due.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                        </p>
                        <p
                          className={cn(
                            "text-[11px]",
                            daysLeft <= 1 ? "text-rose-600" : daysLeft <= 3 ? "text-amber-600" : "text-slate-500",
                          )}
                        >
                          {daysLeft === 0 ? "today" : daysLeft === 1 ? "1 day" : `${daysLeft} days`}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Overdue payments
            </CardTitle>
            <CardDescription>
              {overduePayments.length === 0
                ? "All students up to date"
                : `${overduePayments.length} student${overduePayments.length === 1 ? "" : "s"} late`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {overduePayments.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Nothing to chase right now.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {overduePayments.map((p) => {
                  const student = studentById.get(p.studentId)
                  const group = groupById.get(p.groupId)
                  const due = new Date(p.dueDate)
                  const daysOverdue = Math.ceil((now - due.getTime()) / day)
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {student?.name ?? "Unknown student"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {group?.name ?? "Unknown"} · {p.periodLabel}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-rose-700">
                          {formatMoney(p.amount)}
                        </p>
                        <p className="text-[11px] text-rose-500">
                          {daysOverdue} day{daysOverdue === 1 ? "" : "s"} late
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tests distribution & group breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                  IELTS test catalogue
                </CardTitle>
                <CardDescription>
                  {totalTests} test{totalTests === 1 ? "" : "s"} across 4 skills
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={testsChartData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {testsChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className={cn("h-5 w-5", accent === "violet" ? "text-violet-600" : "text-rose-600")} />
              Groups at a glance
            </CardTitle>
            <CardDescription>Tap to manage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-500">No groups yet.</p>
            ) : (
              groups.slice(0, 4).map((g) => {
                const groupStudents = students.filter((s) => s.groupId === g.id).length
                const groupHomework = homework.filter((h) => h.groupId === g.id).length
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSelectTab?.("groups")}
                    className={cn(
                      "w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm hover:ring-1",
                      accentRing,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{g.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {groupStudents} student{groupStudents === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {groupHomework} homework · {formatMoney((g.monthlyFee ?? 0) * groupStudents)} / mo
                    </p>
                  </button>
                )
              })
            )}
            {groups.length > 4 && (
              <button
                type="button"
                onClick={() => onSelectTab?.("groups")}
                className="w-full rounded-xl border border-dashed border-slate-200 p-2 text-center text-xs text-slate-500 transition-colors hover:bg-slate-50"
              >
                View all {groups.length} groups →
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: typeof Wallet
  label: string
  value: number | string
  sub?: string
  accent: string
  onClick?: () => void
}) {
  const Component = onClick ? "button" : "div"
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all",
        onClick && "hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300",
      )}
    >
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
    </Component>
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
