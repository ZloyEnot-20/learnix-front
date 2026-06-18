import type { Payment } from "./admin-storage"

export function currentPeriodMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function periodMonthOf(payment: Payment): string {
  const d = new Date(payment.dueDate)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export const PAYMENT_STATUS_META: Record<
  Payment["status"],
  { label: string; cls: string }
> = {
  paid: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partial", cls: "bg-sky-100 text-sky-800" },
  pending: { label: "Pending", cls: "bg-slate-100 text-slate-700" },
  overdue: { label: "Overdue", cls: "bg-rose-100 text-rose-700" },
}
