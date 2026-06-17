import type { HomeworkAssignment, HomeworkSubmission } from "./admin-storage"

/** End of the due calendar day in local time (deadline is the full day, not UTC midnight). */
export function endOfDueDay(dueAt: string): number {
  const date = new Date(dueAt)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime()
}

export function isDuePassed(dueAt: string, now = Date.now()): boolean {
  return endOfDueDay(dueAt) < now
}

export function dueDateToEndOfDayIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString()
}

export function submissionNeedsAttention(status: HomeworkSubmission["status"]): boolean {
  return (
    status === "pending" ||
    status === "in_progress" ||
    status === "paused" ||
    status === "submitted"
  )
}

/** Past only when the due day has ended and every student submission is finished. */
export function isHomeworkPast(
  hw: HomeworkAssignment,
  subs: HomeworkSubmission[],
  now = Date.now(),
): boolean {
  if (subs.some((s) => submissionNeedsAttention(s.status))) return false
  return endOfDueDay(hw.dueAt) < now
}

export function daysPastDue(dueAt: string, now = Date.now()): number {
  const dueEnd = endOfDueDay(dueAt)
  if (now <= dueEnd) return 0
  return Math.floor((now - dueEnd) / (24 * 60 * 60 * 1000))
}
