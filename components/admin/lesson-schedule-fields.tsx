"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { normalizeTimeInput, WEEKDAY_OPTIONS } from "@/lib/lesson-schedule"

export interface LessonScheduleFormValues {
  lessonWeekdays: number[]
  lessonStartTime: string
  lessonEndTime: string
}

interface LessonScheduleFieldsProps {
  value: LessonScheduleFormValues
  onChange: (next: LessonScheduleFormValues) => void
  idPrefix?: string
}

export function LessonScheduleFields({ value, onChange, idPrefix = "schedule" }: LessonScheduleFieldsProps) {
  const toggleDay = (day: number) => {
    const next = value.lessonWeekdays.includes(day)
      ? value.lessonWeekdays.filter((d) => d !== day)
      : [...value.lessonWeekdays, day]
    onChange({ ...value, lessonWeekdays: next })
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="space-y-1.5">
        <Label>Lesson days *</Label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_OPTIONS.map(({ value: day, label }) => {
            const active = value.lessonWeekdays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-start`}>From *</Label>
          <Input
            id={`${idPrefix}-start`}
            type="time"
            value={value.lessonStartTime}
            onChange={(e) =>
              onChange({ ...value, lessonStartTime: normalizeTimeInput(e.target.value) })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-end`}>To *</Label>
          <Input
            id={`${idPrefix}-end`}
            type="time"
            value={value.lessonEndTime}
            onChange={(e) =>
              onChange({ ...value, lessonEndTime: normalizeTimeInput(e.target.value) })
            }
          />
        </div>
      </div>
    </div>
  )
}

export function validateLessonScheduleForm(value: LessonScheduleFormValues): string | null {
  if (value.lessonWeekdays.length === 0) return "Select at least one lesson day"
  if (!value.lessonStartTime || !value.lessonEndTime) return "Set lesson start and end time"
  if (value.lessonStartTime >= value.lessonEndTime) return "End time must be after start time"
  return null
}

/** Fresh schedule fields for the create-group dialog — no days pre-selected. */
export function createEmptyLessonSchedule(): LessonScheduleFormValues {
  return {
    lessonWeekdays: [],
    lessonStartTime: "10:00",
    lessonEndTime: "12:00",
  }
}

/** Defaults when editing a group that has no schedule saved yet. */
export const DEFAULT_LESSON_SCHEDULE: LessonScheduleFormValues = {
  lessonWeekdays: [],
  lessonStartTime: "10:00",
  lessonEndTime: "12:00",
}
