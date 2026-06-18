import type { AttendanceStatus, LessonSession } from "./admin-storage"

const ATTENDED: AttendanceStatus[] = ["present", "late", "excused"]

function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export interface StudentAttendanceStat {
  attended: number
  total: number
  /** 0–100, or null when there are no lessons yet. */
  rate: number | null
}

export interface StudentAttendanceInput {
  id: string
  /** ISO date — first day the student counts toward this group's attendance. */
  groupJoinedAt: string
}

function toLocalDateString(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function computeStudentAttendanceRates(
  lessons: LessonSession[],
  students: StudentAttendanceInput[],
  options?: { asOfDate?: string },
): Map<string, StudentAttendanceStat> {
  const asOf = options?.asOfDate ?? todayDateString()
  const completedLessons = lessons.filter((lesson) => lesson.date <= asOf)

  const joinDateByStudent = new Map(
    students.map((s) => [s.id, toLocalDateString(s.groupJoinedAt)]),
  )

  const totals = new Map<string, { attended: number; total: number }>()
  for (const s of students) {
    totals.set(s.id, { attended: 0, total: 0 })
  }

  for (const lesson of completedLessons) {
    if (lesson.canceled) continue
    const byStudent = new Map(lesson.attendance.map((row) => [row.studentId, row.status]))
    for (const s of students) {
      const joinDate = joinDateByStudent.get(s.id)!
      if (lesson.date < joinDate) continue

      const entry = totals.get(s.id)!
      entry.total += 1
      const status = byStudent.get(s.id)
      if (status && ATTENDED.includes(status)) entry.attended += 1
    }
  }

  const result = new Map<string, StudentAttendanceStat>()
  for (const [id, { attended, total }] of totals) {
    result.set(id, {
      attended,
      total,
      rate: total === 0 ? null : Math.round((attended / total) * 100),
    })
  }
  return result
}

export function attendanceRateColor(rate: number | null): string {
  if (rate == null) return "text-slate-400"
  if (rate >= 80) return "text-emerald-700"
  if (rate >= 60) return "text-amber-700"
  return "text-rose-700"
}

export function attendanceRateBadgeCls(rate: number | null): string {
  if (rate == null) return "bg-slate-100 text-slate-500"
  if (rate >= 80) return "bg-emerald-50 text-emerald-700"
  if (rate >= 60) return "bg-amber-50 text-amber-700"
  return "bg-rose-50 text-rose-700"
}
