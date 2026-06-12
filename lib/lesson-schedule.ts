export interface LessonSchedule {
  weekdays: number[]
  startTime: string
  endTime: string
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
] as const

export function formatLessonSchedule(schedule: LessonSchedule | null | undefined): string | null {
  if (!schedule?.weekdays?.length || !schedule.startTime || !schedule.endTime) return null
  const days = [...schedule.weekdays]
    .sort((a, b) => {
      const order = (d: number) => (d === 0 ? 7 : d)
      return order(a) - order(b)
    })
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ")
  return `${days} · ${schedule.startTime}–${schedule.endTime}`
}

export interface StudentContextResponse {
  groupName: string | null
  teacherName: string | null
  lessonSchedule: LessonSchedule | null
}
