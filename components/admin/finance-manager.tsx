"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Clock,
  Filter,
  Plus,
  TrendingUp,
  Undo2,
  Wallet,
  X,
} from "lucide-react"
import {
  createPayment,
  getGroupFinanceSummary,
  listGroups,
  listPayments,
  listStudents,
  markPaymentPaid,
  markPaymentUnpaid,
  type Group,
  type Payment,
  type Student,
} from "@/lib/admin-storage"
import { useToast } from "@/hooks/use-toast"
import { cn, formatMoney, formatThousands, parseDigits } from "@/lib/utils"

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
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | Payment["status"]>("all")
  const [showAdd, setShowAdd] = useState(false)

  const [form, setForm] = useState({
    studentId: "",
    periodMonth: defaultPeriodMonth(),
    amount: 1_000_000,
  })

  const refresh = () => {
    setGroups(listGroups())
    setStudents(listStudents())
    setPayments(listPayments())
  }
  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    return payments
      .filter((p) => (groupFilter === "all" ? true : p.groupId === groupFilter))
      .filter((p) => (statusFilter === "all" ? true : p.status === statusFilter))
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
  }, [payments, groupFilter, statusFilter])

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

  const handleTogglePaid = (p: Payment) => {
    if (p.status === "paid") markPaymentUnpaid(p.id)
    else markPaymentPaid(p.id)
    refresh()
    onChanged?.()
  }

  const handleAddPayment = () => {
    if (!form.studentId || !form.amount || !form.periodMonth) {
      toast({ title: "Fill all required fields", variant: "destructive" })
      return
    }
    const student = students.find((s) => s.id === form.studentId)
    if (!student?.groupId) {
      toast({ title: "Student must belong to a group", variant: "destructive" })
      return
    }
    const [yearStr, monthStr] = form.periodMonth.split("-")
    const year = Number(yearStr)
    const month = Number(monthStr) - 1
    const dueIso = new Date(year, month, 5).toISOString()
    const periodLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
    const overdue = new Date(dueIso).getTime() < Date.now()
    createPayment({
      studentId: form.studentId,
      groupId: student.groupId,
      amount: Math.max(0, Number(form.amount) || 0),
      periodLabel,
      dueDate: dueIso,
      status: overdue ? "overdue" : "pending",
    })
    toast({ title: "Payment record added" })
    setShowAdd(false)
    setForm({
      studentId: "",
      periodMonth: defaultPeriodMonth(),
      amount: 1_000_000,
    })
    refresh()
    onChanged?.()
  }

  const groupSummary = useMemo(() => {
    return groups.map((g) => ({ group: g, summary: getGroupFinanceSummary(g.id) }))
  }, [groups, payments])

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
                  {groupFilter === "all"
                    ? "Track who paid and who didn't across all groups"
                    : "Filtered to a single group — clear the filter to see everyone"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
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
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => setShowAdd(true)}
                  disabled={students.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add payment
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                <p className="font-medium text-slate-900">No payments to show</p>
                <p className="text-sm text-slate-500">Adjust filters or add a new payment record.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-3 font-semibold">Student</th>
                      <th className="py-3 px-3 font-semibold">Group</th>
                      <th className="py-3 px-3 font-semibold">Period</th>
                      <th className="py-3 px-3 font-semibold">Due</th>
                      <th className="py-3 px-3 font-semibold">Amount</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, idx) => {
                      const student = students.find((s) => s.id === p.studentId)
                      const group = groups.find((g) => g.id === p.groupId)
                      const meta = STATUS_META[p.status]
                      return (
                        <tr
                          key={p.id}
                          className={cn(
                            "border-b border-slate-100 transition-colors hover:bg-slate-200/60",
                            idx % 2 === 1 ? "bg-slate-100/70" : "bg-white",
                          )}
                        >
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {student?.name ?? "—"}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{group?.name ?? "—"}</td>
                          <td className="py-3 px-3 text-slate-600">{p.periodLabel}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(p.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-semibold tabular-nums text-slate-900">
                            {formatMoney(p.amount)}
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
                            <Button
                              variant={p.status === "paid" ? "outline" : "default"}
                              size="sm"
                              onClick={() => handleTogglePaid(p)}
                              className={
                                p.status === "paid"
                                  ? ""
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }
                            >
                              {p.status === "paid" ? (
                                <>
                                  <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                                  Unmark
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                  Mark paid
                                </>
                              )}
                            </Button>
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payment record</DialogTitle>
            <DialogDescription>Track an expected monthly payment for a student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Student *</Label>
              <Select value={form.studentId} onValueChange={(v) => setForm({ ...form, studentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a student" />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter((s) => !!s.groupId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-month">Month *</Label>
                <Input
                  id="p-month"
                  type="month"
                  value={form.periodMonth}
                  onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
                />
                <p className="text-[11px] text-slate-500">
                  Payment for{" "}
                  <span className="font-medium text-slate-700">
                    {formatPeriodLabel(form.periodMonth)}
                  </span>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-amount">Amount (som) *</Label>
                <Input
                  id="p-amount"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatThousands(form.amount)}
                  onChange={(e) =>
                    setForm({ ...form, amount: parseDigits(e.target.value) })
                  }
                  placeholder="1 000 000"
                  className="tabular-nums"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button
              onClick={handleAddPayment}
              className="bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600"
            >
              Add
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
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

function defaultPeriodMonth(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
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

