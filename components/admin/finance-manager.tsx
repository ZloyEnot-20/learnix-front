"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MonthPicker } from "@/components/ui/month-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  TrendingUp,
  Undo2,
  Wallet,
  X,
} from "lucide-react"
import type { Group, Payment, Student } from "@/lib/admin-storage"
import { useAdminData } from "@/lib/admin-data-context"
import { CardGridSkeleton, StatCardsSkeleton, TableCardSkeleton } from "./skeletons"
import { paymentsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn, formatMoney } from "@/lib/utils"

const STATUS_META: Record<
  Payment["status"],
  { label: string; cls: string; dot: string }
> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  overdue: { label: "Overdue", cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
}

interface FinanceManagerProps {
  onChanged?: () => void
}

export default function FinanceManager({ onChanged }: FinanceManagerProps) {
  const { toast } = useToast()
  const { students, groups, refreshStudents, refreshGroups } = useAdminData()
  const [payments, setPayments] = useState<Payment[]>([])
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all")
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultPeriodMonth())
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const [, , p] = await Promise.all([
        refreshGroups(true),
        refreshStudents(true),
        paymentsApi.list(),
      ])
      setPayments(p)
    } catch {
      toast({
        title: "Failed to load finance data",
        description: "Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
  }, [])

  /**
   * One row per student (scoped to the group filter) for the selected month,
   * joined with their payment record for that month if it exists.
   */
  const monthRows = useMemo(() => {
    const monthPast = isMonthInPast(selectedMonth)
    const rows = students
      .filter((s) => !!s.groupId)
      .filter((s) => (groupFilter === "all" ? true : s.groupId === groupFilter))
      .map((student) => {
        const payment = payments.find(
          (p) => p.studentId === student.id && periodMonthOf(p) === selectedMonth,
        )
        const group = groups.find((g) => g.id === student.groupId)
        const paid = payment?.status === "paid"
        const amount =
          payment?.amount ?? student.monthlyFee ?? group?.monthlyFee ?? 0
        const status: "paid" | "unpaid" = paid ? "paid" : "unpaid"
        return { student, group, payment, paid, amount, status, monthPast }
      })
      .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
    return rows.sort((a, b) => {
      // Unpaid first, then by name.
      if (a.paid !== b.paid) return a.paid ? 1 : -1
      return a.student.name.localeCompare(b.student.name)
    })
  }, [students, groups, payments, groupFilter, statusFilter, selectedMonth])

  const totals = useMemo(() => {
    let expected = 0
    let collected = 0
    let pending = 0
    let overdue = 0
    for (const p of payments) {
      expected += p.amount
      if (p.status === "paid") collected += p.amount
      else if (p.status === "overdue") overdue += p.amount
      else pending += p.amount
    }
    return { expected, collected, pending, overdue }
  }, [payments])

  /** Mark a student as paid for the selected month (creating a record if needed). */
  const markStudentPaid = async (row: {
    student: Student
    group?: Group
    payment?: Payment
    amount: number
  }) => {
    if (!row.student.groupId) {
      toast({ title: "Student must belong to a group", variant: "destructive" })
      return
    }
    const id = row.student.id
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      if (row.payment) {
        await paymentsApi.markPaid(row.payment.id)
      } else {
        const [year, month] = selectedMonth.split("-").map(Number)
        const dueIso = new Date(year, month - 1, 5).toISOString()
        await paymentsApi.create({
          studentId: row.student.id,
          groupId: row.student.groupId,
          amount: Math.max(0, row.amount),
          periodLabel: formatPeriodLabel(selectedMonth),
          dueDate: dueIso,
          status: "paid",
        })
      }
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not update payment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  /** Revert a paid record back to unpaid for the selected month. */
  const unmarkStudent = async (row: { student: Student; payment?: Payment }) => {
    if (!row.payment) return
    const id = row.student.id
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      await paymentsApi.markUnpaid(row.payment.id)
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not update payment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const groupSummary = useMemo(() => {
    return groups.map((g) => {
      const groupPayments = payments.filter((p) => p.groupId === g.id)
      const summary = { expectedTotal: 0, paidTotal: 0, overdueTotal: 0 }
      for (const p of groupPayments) {
        summary.expectedTotal += p.amount
        if (p.status === "paid") summary.paidTotal += p.amount
        else if (p.status === "overdue") summary.overdueTotal += p.amount
      }
      return { group: g, summary }
    })
  }, [groups, payments])

  if (loading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={4} />
        <CardGridSkeleton count={4} columns={2} />
        <TableCardSkeleton rows={6} columns={5} />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Platform totals</h2>
            <p className="text-xs text-slate-500">
              Aggregated across all groups · {groups.length} group{groups.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              icon={Banknote}
              label="Total expected"
              value={formatMoney(totals.expected)}
              accent="bg-slate-100 text-slate-700"
            />
            <Stat
              icon={CheckCircle2}
              label="Total collected"
              value={formatMoney(totals.collected)}
              accent="bg-emerald-50 text-emerald-700"
            />
            <Stat
              icon={Clock}
              label="Total pending"
              value={formatMoney(totals.pending)}
              accent="bg-amber-50 text-amber-700"
            />
            <Stat
              icon={TrendingUp}
              label="Total overdue"
              value={formatMoney(totals.overdue)}
              accent={
                totals.overdue > 0
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-700"
              }
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>By group</CardTitle>
                <CardDescription>
                  Click a group to filter the payments list below
                </CardDescription>
              </div>
              {groupFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGroupFilter("all")}
                  className="gap-1.5 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Show all groups
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {groupSummary.length === 0 ? (
              <p className="text-sm text-slate-500">No groups yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupSummary.map(({ group, summary }) => {
                  const rate = summary.expectedTotal ? Math.round((summary.paidTotal / summary.expectedTotal) * 100) : 0
                  const isSelected = groupFilter === group.id
                  const isDimmed = groupFilter !== "all" && !isSelected
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setGroupFilter(isSelected ? "all" : group.id)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-slate-900 bg-gradient-to-br from-slate-900/[0.04] to-emerald-100/40 ring-2 ring-slate-900 ring-offset-2 shadow-md"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm",
                        isDimmed && "opacity-60",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Selected
                        </span>
                      )}
                      <div className={cn("flex items-start justify-between gap-2", isSelected && "pr-20")}>
                        <h3
                          className={cn(
                            "truncate font-semibold",
                            isSelected ? "text-slate-900" : "text-slate-900",
                          )}
                        >
                          {group.name}
                        </h3>
                        {!isSelected && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {rate}% paid
                          </span>
                        )}
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <Mini label="Expected" value={formatMoney(summary.expectedTotal)} cls="text-slate-700" />
                        <Mini label="Collected" value={formatMoney(summary.paidTotal)} cls="text-emerald-700" />
                        <Mini
                          label="Overdue"
                          value={formatMoney(summary.overdueTotal)}
                          cls={summary.overdueTotal > 0 ? "text-rose-700" : "text-slate-400"}
                        />
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                          <Filter className="h-3 w-3" />
                          Showing payments for this group
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  Payments
                  {groupFilter !== "all" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                      <Filter className="h-3 w-3" />
                      {groups.find((g) => g.id === groupFilter)?.name ?? "Group"}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setGroupFilter("all")
                        }}
                        aria-label="Clear group filter"
                        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/15"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Pick a month, then mark each student as paid ·{" "}
                  <span className="font-medium text-slate-700">
                    {formatPeriodLabel(selectedMonth)}
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <MonthPicker
                    aria-label="Payment month"
                    value={selectedMonth}
                    onChange={(v) => setSelectedMonth(v || defaultPeriodMonth())}
                    className="w-44"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Not paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {monthRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <p className="font-medium text-slate-900">No students to show</p>
                <p className="text-sm text-slate-500">
                  {students.filter((s) => !!s.groupId).length === 0
                    ? "Assign students to a group first."
                    : "Adjust the group or status filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3 font-semibold">Student</th>
                      <th className="py-3 px-3 font-semibold">Group</th>
                      <th className="py-3 px-3 font-semibold">Amount</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((row, idx) => {
                      const meta = row.paid
                        ? STATUS_META.paid
                        : row.monthPast
                          ? STATUS_META.overdue
                          : STATUS_META.pending
                      return (
                        <tr
                          key={row.student.id}
                          className={cn(
                            "border-b border-slate-100 transition-colors hover:bg-slate-200/60",
                            idx % 2 === 1 ? "bg-slate-100/70" : "bg-white",
                          )}
                        >
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {row.student.name}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{row.group?.name ?? "—"}</td>
                          <td className="py-3 px-3 font-semibold tabular-nums text-slate-900">
                            {row.amount > 0 ? formatMoney(row.amount) : "—"}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                meta.cls,
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                              {row.paid ? "Paid" : "Not paid"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {row.paid ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unmarkStudent(row)}
                                loading={togglingIds.has(row.student.id)}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                                Unmark
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => markStudentPaid(row)}
                                loading={togglingIds.has(row.student.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                Mark paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Wallet
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

function Mini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("font-semibold tabular-nums", cls)}>{value}</p>
    </div>
  )
}

function defaultPeriodMonth(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/** Shift a `YYYY-MM` month string by the given number of months. */
function shiftMonth(periodMonth: string, delta: number): string {
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return defaultPeriodMonth()
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** The `YYYY-MM` period a payment belongs to, derived from its due date. */
function periodMonthOf(p: Payment): string {
  const d = new Date(p.dueDate)
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${d.getFullYear()}-${month}`
}

/** True when the given `YYYY-MM` month is earlier than the current month. */
function isMonthInPast(periodMonth: string): boolean {
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return false
  const now = new Date()
  const current = now.getFullYear() * 12 + now.getMonth()
  return year * 12 + (month - 1) < current
}

function formatPeriodLabel(periodMonth: string): string {
  if (!periodMonth) return "—"
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return "—"
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

