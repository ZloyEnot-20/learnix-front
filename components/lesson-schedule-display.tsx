import { cn } from "@/lib/utils"
import {
  formatLessonScheduleTime,
  hasValidLessonSchedule,
  sortWeekdays,
  WEEKDAY_BADGE_CLASSES,
  WEEKDAY_LABELS,
  type LessonSchedule,
} from "@/lib/lesson-schedule"

interface WeekdayBadgeProps {
  day: number
  size?: "xs" | "sm"
  className?: string
}

export function WeekdayBadge({ day, size = "sm", className }: WeekdayBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-bold uppercase tracking-wide",
        size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
        WEEKDAY_BADGE_CLASSES[day] ?? WEEKDAY_BADGE_CLASSES[1],
        className,
      )}
    >
      {WEEKDAY_LABELS[day] ?? WEEKDAY_LABELS[1]}
    </span>
  )
}

interface LessonScheduleDisplayProps {
  schedule: LessonSchedule | null | undefined
  size?: "xs" | "sm"
  showTime?: boolean
  layout?: "inline" | "stacked"
  className?: string
  timeClassName?: string
}

export function LessonScheduleDisplay({
  schedule,
  size = "sm",
  showTime = true,
  layout = "inline",
  className,
  timeClassName,
}: LessonScheduleDisplayProps) {
  if (!hasValidLessonSchedule(schedule)) return null
  const time = formatLessonScheduleTime(schedule)
  const days = sortWeekdays(schedule!.weekdays)
  const stacked = layout === "stacked"

  return (
    <div
      className={cn(
        "min-w-0",
        stacked
          ? "inline-flex flex-col items-center gap-1"
          : "inline-flex flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <div className={cn("flex flex-wrap gap-1", stacked && "justify-center")}>
        {days.map((day) => (
          <WeekdayBadge key={day} day={day} size={size} />
        ))}
      </div>
      {showTime && time ? (
        <span
          className={cn(
            "tabular-nums text-slate-600",
            size === "xs" ? "text-[10px]" : "text-xs",
            stacked && "text-center",
            timeClassName,
          )}
        >
          {time}
        </span>
      ) : null}
    </div>
  )
}
