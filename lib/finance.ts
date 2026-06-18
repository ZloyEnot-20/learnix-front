import type { Group, Payment, Student } from "./admin-storage"
import { periodMonthOf } from "./payment-period"

export function periodMonthFromDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function studentJoinedMonth(student: Student): string | null {
  const raw = student.groupJoinedAt ?? student.joinedAt
  if (!raw) return null
  return periodMonthFromDate(raw)
}

/** Student owes fees starting from the month they joined the group. */
export function isStudentBillableInMonth(student: Student, periodMonth: string): boolean {
  if (!student.groupId) return false
  const joined = studentJoinedMonth(student)
  if (!joined) return false
  return joined <= periodMonth
}

export function groupMonthlyFee(group?: Group | null): number {
  return typeof group?.monthlyFee === "number" ? group.monthlyFee : 0
}

export function paymentPaidAmount(payment?: Payment | null): number {
  if (!payment) return 0
  if (typeof payment.paidAmount === "number") return payment.paidAmount
  if (payment.status === "paid") return payment.amount
  return 0
}

export function paymentRemaining(payment: Payment | undefined, expected: number): number {
  return Math.max(0, expected - paymentPaidAmount(payment))
}

export type FinanceRowStatus = "paid" | "partial" | "pending" | "overdue"

export function financeRowStatus(
  expected: number,
  paidAmount: number,
  monthPast: boolean,
): FinanceRowStatus {
  if (expected > 0 && paidAmount >= expected) return "paid"
  if (paidAmount > 0) return "partial"
  return monthPast ? "overdue" : "pending"
}

export function findPaymentForMonth(
  payments: Payment[],
  studentId: string,
  periodMonth: string,
): Payment | undefined {
  return payments.find(
    (p) => p.studentId === studentId && periodMonthOf(p) === periodMonth,
  )
}

export interface FinanceMonthRow {
  student: Student
  group?: Group
  payment?: Payment
  expected: number
  paidAmount: number
  remaining: number
  status: FinanceRowStatus
  monthPast: boolean
}

export function buildFinanceMonthRow(
  student: Student,
  group: Group | undefined,
  payment: Payment | undefined,
  periodMonth: string,
): FinanceMonthRow | null {
  if (!isStudentBillableInMonth(student, periodMonth)) return null

  const expected = groupMonthlyFee(group)
  const paidAmount = paymentPaidAmount(payment)
  const monthPast = isMonthInPast(periodMonth)

  return {
    student,
    group,
    payment,
    expected,
    paidAmount,
    remaining: Math.max(0, expected - paidAmount),
    status: financeRowStatus(expected, paidAmount, monthPast),
    monthPast,
  }
}

export function isMonthInPast(periodMonth: string): boolean {
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return false
  const now = new Date()
  const current = now.getFullYear() * 12 + now.getMonth()
  return year * 12 + (month - 1) < current
}

export function formatPeriodLabel(periodMonth: string): string {
  if (!periodMonth) return "—"
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return "—"
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function defaultPeriodMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function shiftMonth(periodMonth: string, delta: number): string {
  const [year, month] = periodMonth.split("-").map(Number)
  if (!year || !month) return defaultPeriodMonth()
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function dueDateForPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split("-").map(Number)
  return new Date(year, month - 1, 5).toISOString()
}

export interface FinanceTotals {
  expected: number
  collected: number
  pending: number
  overdue: number
}

export function summarizeFinanceRows(rows: FinanceMonthRow[]): FinanceTotals {
  let expected = 0
  let collected = 0
  let pending = 0
  let overdue = 0

  for (const row of rows) {
    expected += row.expected
    collected += row.paidAmount
    const left = Math.max(0, row.expected - row.paidAmount)
    if (left <= 0) continue
    if (row.monthPast) overdue += left
    else pending += left
  }

  return { expected, collected, pending, overdue }
}
