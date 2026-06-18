export interface LessonSchedule {
  weekdays: number[]
  startTime: string
  endTime: string
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export const WEEKDAY_FULL_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export function weekdayFullLabel(day: number): string {
  return WEEKDAY_FULL_LABELS[day] ?? WEEKDAY_FULL_LABELS[0]
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const

/** Tailwind classes for weekday display badges (0 = Sun … 6 = Sat). */
export const WEEKDAY_BADGE_CLASSES: Record<number, string> = {
  0: "bg-rose-100 text-rose-800 border-rose-200",
  1: "bg-blue-100 text-blue-800 border-blue-200",
  2: "bg-emerald-100 text-emerald-800 border-emerald-200",
  3: "bg-amber-100 text-amber-900 border-amber-200",
  4: "bg-violet-100 text-violet-800 border-violet-200",
  5: "bg-sky-100 text-sky-800 border-sky-200",
  6: "bg-orange-100 text-orange-800 border-orange-200",
}

export function sortWeekdays(days: number[]): number[] {
  return [...days].sort((a, b) => {
    const order = (d: number) => (d === 0 ? 7 : d)
    return order(a) - order(b)
  })
}

export function hasValidLessonSchedule(schedule: LessonSchedule | null | undefined): boolean {
  return Boolean(schedule?.weekdays?.length && schedule.startTime && schedule.endTime)
}

export function formatLessonScheduleTime(schedule: LessonSchedule | null | undefined): string | null {
  if (!hasValidLessonSchedule(schedule)) return null
  return `${schedule!.startTime}–${schedule!.endTime}`
}

/** Normalize `<input type="time">` values to HH:mm (some browsers send HH:mm:ss). */
export function normalizeTimeInput(time: string): string {
  const match = time.trim().match(/^([01]\d|2[0-3]):([0-5]\d)/)
  return match ? `${match[1]}:${match[2]}` : time.trim().slice(0, 5)
}

export function normalizeLessonSchedulePayload(
  value: Pick<LessonScheduleFormShape, "lessonWeekdays" | "lessonStartTime" | "lessonEndTime">,
): Pick<LessonScheduleFormShape, "lessonWeekdays" | "lessonStartTime" | "lessonEndTime"> {
  return {
    lessonWeekdays: [...new Set(value.lessonWeekdays.map(Number).filter((d) => d >= 0 && d <= 6))],
    lessonStartTime: normalizeTimeInput(value.lessonStartTime),
    lessonEndTime: normalizeTimeInput(value.lessonEndTime),
  }
}

type LessonScheduleFormShape = {
  lessonWeekdays: number[]
  lessonStartTime: string
  lessonEndTime: string
}

export function formatLessonSchedule(schedule: LessonSchedule | null | undefined): string | null {
  const time = formatLessonScheduleTime(schedule)
  if (!time || !schedule?.weekdays?.length) return null
  const days = sortWeekdays(schedule.weekdays)
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ")
  return `${days} · ${time}`
}

export function groupToLessonSchedule(group: {
  lessonWeekdays?: number[]
  lessonStartTime?: string
  lessonEndTime?: string
}): LessonSchedule | null {
  if (!group.lessonWeekdays?.length || !group.lessonStartTime || !group.lessonEndTime) return null
  return {
    weekdays: group.lessonWeekdays,
    startTime: group.lessonStartTime,
    endTime: group.lessonEndTime,
  }
}

export interface StudentContextResponse {
  groupName: string | null
  teacherName: string | null
  lessonSchedule: LessonSchedule | null
}

export function weekdayFromDate(date: string): number {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Normalize weekday indices from API/forms (0 = Sun … 6 = Sat). */
export function normalizeWeekdays(days: number[] | undefined | null): number[] {
  return [...new Set((days ?? []).map(Number).filter((d) => d >= 0 && d <= 6))]
}

/** Calendar dates in month matching group lessonWeekdays (0 = Sun … 6 = Sat). */
export function scheduledDatesInMonth(year: number, month: number, weekdays: number[]): Set<string> {
  const set = new Set<string>()
  if (!weekdays.length) return set
  const lastDay = new Date(year, month, 0).getDate()
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    if (weekdays.includes(weekdayFromDate(date))) {
      set.add(date)
    }
  }
  return set
}

export function isPristineLesson(lesson: {
  topic?: string
  notes?: string
  canceled?: boolean
  cancelReason?: string
  attendanceMarked?: boolean
  attendance?: { status?: string; notes?: string }[]
}): boolean {
  if (lesson.canceled || lesson.cancelReason?.trim()) return false
  if (lesson.attendanceMarked) return false
  if (lesson.topic?.trim() || lesson.notes?.trim()) return false
  return (lesson.attendance ?? []).every(
    (row) => (!row.status || row.status === "present") && !row.notes?.trim(),
  )
}

/** Auto-created lessons on weekdays removed from the group schedule are hidden. */
export function lessonMatchesSchedule(
  lesson: {
    date: string
    fromSchedule?: boolean
    canceled?: boolean
    attendanceMarked?: boolean
    topic?: string
    notes?: string
    attendance?: { status?: string; notes?: string }[]
  },
  weekdays: number[],
): boolean {
  const onSchedule = weekdays.includes(weekdayFromDate(lesson.date))
  if (onSchedule) return true
  if (lesson.attendanceMarked || lesson.canceled) return true
  if (lesson.fromSchedule) return false
  if (isPristineLesson(lesson)) return false
  return true
}

export function filterLessonsForSchedule<T extends { date: string; fromSchedule?: boolean; topic?: string; notes?: string; attendance?: { status: string; notes?: string }[] }>(
  lessons: T[],
  weekdays: number[],
): T[] {
  return lessons.filter((lesson) => lessonMatchesSchedule(lesson, weekdays))
}

export interface ScheduledLessonSlot {
  date: string
  groupId: string
  groupName: string
  startTime: string
  endTime: string
}

export type GroupScheduleSource = {
  id: string
  name: string
  lessonWeekdays?: number[]
  lessonStartTime?: string
  lessonEndTime?: string
}

/** All recurring lesson slots in a month across groups (from weekly schedules). */
export function scheduledLessonSlotsInMonth(
  groups: GroupScheduleSource[],
  year: number,
  month: number,
): ScheduledLessonSlot[] {
  const slots: ScheduledLessonSlot[] = []
  for (const group of groups) {
    const schedule = groupToLessonSchedule(group)
    if (!schedule) continue
    const dates = scheduledDatesInMonth(year, month, schedule.weekdays)
    for (const date of dates) {
      slots.push({
        date,
        groupId: group.id,
        groupName: group.name,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })
    }
  }
  return slots.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.startTime.localeCompare(b.startTime)
  })
}

/** Next scheduled lessons starting from a calendar date (inclusive). */
export function upcomingScheduledLessons(
  groups: GroupScheduleSource[],
  fromDate: string,
  daysAhead: number,
  limit = 12,
): ScheduledLessonSlot[] {
  const [y, m, d] = fromDate.split("-").map(Number)
  const from = new Date(y, m - 1, d)
  const slots: ScheduledLessonSlot[] = []

  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(from)
    date.setDate(from.getDate() + i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const weekday = date.getDay()
    for (const group of groups) {
      const schedule = groupToLessonSchedule(group)
      if (!schedule?.weekdays.includes(weekday)) continue
      slots.push({
        date: dateStr,
        groupId: group.id,
        groupName: group.name,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      })
    }
  }

  return slots
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return a.startTime.localeCompare(b.startTime)
    })
    .slice(0, limit)
}

export function buildMonthCalendarCells(year: number, month: number): Array<{ date: string | null; day: number | null }> {
  const first = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  const cells: Array<{ date: string | null; day: number | null }> = []
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null })
  for (let d = 1; d <= lastDay; d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ date, day: d })
  }
  return cells
}

export function todayDateString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function currentMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}
