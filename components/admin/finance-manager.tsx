"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MonthPicker } from "@/components/ui/month-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { FinanceMonthRow } from "@/lib/finance"
import {
  buildFinanceMonthRow,
  defaultPeriodMonth,
  dueDateForPeriodMonth,
  findPaymentForMonth,
  formatPeriodLabel,
  shiftMonth,
  summarizeFinanceRows,
} from "@/lib/finance"
import { useAdminData } from "@/lib/admin-data-context"
import { selectableGroups } from "@/lib/entry-test-group"
import { CardGridSkeleton, StatCardsSkeleton, TableCardSkeleton } from "./skeletons"
import { paymentsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn, formatMoney, formatThousands, parseDigits } from "@/lib/utils"

const STATUS_META = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  partial: { label: "Partial", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  pending: { label: "Not paid", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  overdue: { label: "Overdue", cls: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
} as const

interface FinanceManagerProps {
  onChanged?: () => void
}

export default function FinanceManager({ onChanged }: FinanceManagerProps) {
  const { toast } = useToast()
  const { students, groups } = useAdminData()
  const assignableGroups = useMemo(() => selectableGroups(groups), [groups])
  const scopedGroupIds = useMemo(() => new Set(groups.map((g) => g.id)), [groups])
  const scopedStudents = useMemo(
    () => students.filter((s) => s.groupId && scopedGroupIds.has(s.groupId)),
    [students, scopedGroupIds],
  )
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof paymentsApi.list>>>([])
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "unpaid">("all")
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultPeriodMonth())
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [paymentRow, setPaymentRow] = useState<FinanceMonthRow | null>(null)
  const [paymentInput, setPaymentInput] = useState(0)
  const [recording, setRecording] = useState(false)

  const refresh = async () => {
    try {
      const p = await paymentsApi.list()
      const allowed = new Set(groups.map((g) => g.id))
      setPayments(p.filter((row) => row.groupId && allowed.has(row.groupId)))
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
  }, [groups])

  const allMonthRows = useMemo(() => {
    const rows: FinanceMonthRow[] = []
    for (const student of scopedStudents.filter((s) => !!s.groupId)) {
      if (groupFilter !== "all" && student.groupId !== groupFilter) continue
      const group = groups.find((g) => g.id === student.groupId)
      const payment = findPaymentForMonth(payments, student.id, selectedMonth)
      const row = buildFinanceMonthRow(student, group, payment, selectedMonth)
      if (row) rows.push(row)
    }
    return rows.sort((a, b) => a.student.name.localeCompare(b.student.name))
  }, [scopedStudents, groups, payments, groupFilter, selectedMonth])

  const billableRowsForMonth = useMemo(() => {
    const rows: FinanceMonthRow[] = []
    for (const student of scopedStudents.filter((s) => !!s.groupId)) {
      const group = groups.find((g) => g.id === student.groupId)
      const payment = findPaymentForMonth(payments, student.id, selectedMonth)
      const row = buildFinanceMonthRow(student, group, payment, selectedMonth)
      if (row) rows.push(row)
    }
    return rows
  }, [scopedStudents, groups, payments, selectedMonth])

  const monthRows = useMemo(() => {
    return allMonthRows.filter((row) => {
      if (statusFilter === "all") return true
      if (statusFilter === "paid") return row.status === "paid"
      return row.status !== "paid"
    })
  }, [allMonthRows, statusFilter])

  const totals = useMemo(() => {
    const source =
      groupFilter === "all"
        ? billableRowsForMonth
        : billableRowsForMonth.filter((r) => r.student.groupId === groupFilter)
    return summarizeFinanceRows(source)
  }, [billableRowsForMonth, groupFilter])

  const groupSummary = useMemo(() => {
    return assignableGroups.map((g) => {
      const rows = billableRowsForMonth.filter((r) => r.student.groupId === g.id)
      return { group: g, summary: summarizeFinanceRows(rows), count: rows.length }
    })
  }, [assignableGroups, billableRowsForMonth])

  const openPaymentDialog = (row: FinanceMonthRow) => {
    setPaymentRow(row)
    setPaymentInput(row.remaining > 0 ? row.remaining : row.expected)
  }

  const recordPayment = async () => {
    if (!paymentRow?.student.groupId) return
    const amount = Math.max(0, paymentInput)
    if (amount <= 0) {
      toast({ title: "Enter a payment amount", variant: "destructive" })
      return
    }
    if (amount > paymentRow.remaining && paymentRow.remaining > 0) {
      toast({
        title: "Amount exceeds balance",
        description: `Remaining: ${formatMoney(paymentRow.remaining)}`,
        variant: "destructive",
      })
      return
    }

    const id = paymentRow.student.id
    setRecording(true)
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      if (paymentRow.payment) {
        const updated = await paymentsApi.markPaid(paymentRow.payment.id, amount)
        setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        const created = await paymentsApi.create({
          studentId: paymentRow.student.id,
          groupId: paymentRow.student.groupId,
          amount: paymentRow.expected,
          paidAmount: amount,
          periodLabel: formatPeriodLabel(selectedMonth),
          dueDate: dueDateForPeriodMonth(selectedMonth),
        })
        setPayments((prev) => [...prev, created])
      }
      setPaymentRow(null)
      onChanged?.()
      toast({ title: "Payment recorded" })
    } catch (err) {
      toast({
        title: "Could not record payment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRecording(false)
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const unmarkStudent = async (row: FinanceMonthRow) => {
    if (!row.payment) return
    const id = row.student.id
    setTogglingIds((prev) => new Set(prev).add(id))
    try {
      const updated = await paymentsApi.markUnpaid(row.payment.id)
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not reset payment",
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
              {formatPeriodLabel(selectedMonth)} · group fee × active students
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
                  {formatPeriodLabel(selectedMonth)} · fee × students who joined this month or earlier
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
                {groupSummary.map(({ group, summary, count }) => {
                  const rate = summary.expected
                    ? Math.round((summary.collected / summary.expected) * 100)
                    : 0
                  const isSelected = groupFilter === group.id
                  const isDimmed = groupFilter !== "all" && !isSelected
                  const fee = group.monthlyFee ?? 0
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
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-slate-900">{group.name}</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {formatMoney(fee)} × {count} student{count === 1 ? "" : "s"}
                          </p>
                        </div>
                        {!isSelected && (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {rate}% collected
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
                        <Mini label="Expected" value={formatMoney(summary.expected)} cls="text-slate-700" />
                        <Mini label="Collected" value={formatMoney(summary.collected)} cls="text-emerald-700" />
                        <Mini
                          label="Overdue"
                          value={formatMoney(summary.overdue)}
                          cls={summary.overdue > 0 ? "text-rose-700" : "text-slate-400"}
                        />
                      </div>
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
                  Students appear from their join month · partial payments supported ·{" "}
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
                    {assignableGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="paid">Fully paid</SelectItem>
                    <SelectItem value="unpaid">Not fully paid</SelectItem>
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
                  {scopedStudents.filter((s) => !!s.groupId).length === 0
                    ? "Assign students to a group first."
                    : "No billable students for this month or filter."}
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
                      <th className="py-3 px-3 font-semibold">Paid</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((row, idx) => {
                      const meta = STATUS_META[row.status]
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
                            {row.expected > 0 ? formatMoney(row.expected) : "—"}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-slate-700">
                            {row.paidAmount > 0 ? (
                              <span>
                                {formatMoney(row.paidAmount)}
                                {row.remaining > 0 && (
                                  <span className="text-slate-400">
                                    {" "}
                                    / {formatMoney(row.expected)}
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                meta.cls,
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {row.status === "paid" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => unmarkStudent(row)}
                                loading={togglingIds.has(row.student.id)}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                                Reset
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => openPaymentDialog(row)}
                                loading={togglingIds.has(row.student.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Wallet className="h-3.5 w-3.5 mr-1.5" />
                                {row.status === "partial" ? "Add payment" : "Record payment"}
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

      <Dialog open={!!paymentRow} onOpenChange={(open) => !open && setPaymentRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paymentRow && (
                <>
                  {paymentRow.student.name} · {formatPeriodLabel(selectedMonth)} · expected{" "}
                  {formatMoney(paymentRow.expected)}
                  {paymentRow.paidAmount > 0 && (
                    <> · already paid {formatMoney(paymentRow.paidAmount)}</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pay-amount">Amount (som)</Label>
            <Input
              id="pay-amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatThousands(paymentInput)}
              onChange={(e) => setPaymentInput(parseDigits(e.target.value))}
              className="tabular-nums"
            />
            {paymentRow && paymentRow.remaining > 0 && (
              <p className="text-xs text-slate-500">
                Remaining balance: {formatMoney(paymentRow.remaining)}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPaymentRow(null)}>
              Cancel
            </Button>
            <Button onClick={recordPayment} loading={recording} className="bg-emerald-600 hover:bg-emerald-700">
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
