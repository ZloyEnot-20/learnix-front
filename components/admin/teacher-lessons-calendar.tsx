"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MonthPicker } from "@/components/ui/month-picker"
import { lessonsApi } from "@/lib/api"
import type { Group, LessonSession, Student } from "@/lib/admin-storage"
import {
  buildMonthCalendarCells,
  currentMonthString,
  groupToLessonSchedule,
  scheduledLessonSlotsInMonth,
  todayDateString,
  upcomingScheduledLessons,
  weekdayFullLabel,
  weekdayFromDate,
  type ScheduledLessonSlot,
} from "@/lib/lesson-schedule"
import { cn } from "@/lib/utils"
import { LessonAttendanceEditor } from "./lesson-attendance-editor"

interface Props {
  groups: Group[]
  students: Student[]
  onOpenGroups?: () => void
}

function parseMonth(month: string): { year: number; monthNum: number } {
  const [year, monthNum] = month.split("-").map(Number)
  return { year, monthNum }
}

function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function TeacherLessonsCalendar({ groups, students, onOpenGroups }: Props) {
  const today = todayDateString()
  const [month, setMonth] = useState(currentMonthString)
  const [selectedDate, setSelectedDate] = useState(today)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonSession[]>([])
  const [loading, setLoading] = useState(true)

  const groupsWithSchedule = useMemo(
    () => groups.filter((g) => groupToLessonSchedule(g)),
    [groups],
  )

  const { year, monthNum } = parseMonth(month)

  const scheduledSlots = useMemo(
    () => scheduledLessonSlotsInMonth(groupsWithSchedule, year, monthNum),
    [groupsWithSchedule, year, monthNum],
  )

  const slotsByDate = useMemo(() => {
    const map = new Map<string, ScheduledLessonSlot[]>()
    for (const slot of scheduledSlots) {
      const list = map.get(slot.date) ?? []
      list.push(slot)
      map.set(slot.date, list)
    }
    return map
  }, [scheduledSlots])

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, LessonSession[]>()
    for (const lesson of lessons) {
      const list = map.get(lesson.date) ?? []
      list.push(lesson)
      map.set(lesson.date, list)
    }
    return map
  }, [lessons])

  useEffect(() => {
    let cancelled = false
    if (groupsWithSchedule.length === 0) {
      setLessons([])
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all(groupsWithSchedule.map((g) => lessonsApi.list({ groupId: g.id, month })))
      .then((results) => {
        if (cancelled) return
        setLessons(results.flat())
      })
      .catch(() => {
        if (!cancelled) setLessons([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [groupsWithSchedule, month])

  useEffect(() => {
    if (selectedDate.startsWith(month)) return
    setSelectedDate(today.startsWith(month) ? today : `${month}-01`)
  }, [month, selectedDate, today])

  const calendarDays = useMemo(() => buildMonthCalendarCells(year, monthNum), [year, monthNum])

  const upcoming = useMemo(
    () => upcomingScheduledLessons(groupsWithSchedule, today, 13),
    [groupsWithSchedule, today],
  )

  const selectedSlots = slotsByDate.get(selectedDate) ?? []
  const selectedLessons = lessonsByDate.get(selectedDate) ?? []

  const lessonsThisWeek = useMemo(() => {
    const end = new Date()
    end.setDate(end.getDate() + 6)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`
    return scheduledSlots.filter((s) => s.date >= today && s.date <= endStr).length
  }, [scheduledSlots, today])

  const pickDefaultGroupId = (date: string, slots: ScheduledLessonSlot[]): string | null => {
    if (slots.length === 0) return null
    const dayLessons = lessonsByDate.get(date) ?? []
    const pending = slots.find((slot) => {
      const lesson = dayLessons.find((l) => l.groupId === slot.groupId)
      return !lesson?.canceled && !lesson?.attendanceMarked
    })
    return (pending ?? slots[0]).groupId
  }

  useEffect(() => {
    if (selectedSlots.length === 0) {
      setActiveGroupId(null)
      return
    }
    setActiveGroupId((prev) => {
      if (prev && selectedSlots.some((s) => s.groupId === prev)) return prev
      return pickDefaultGroupId(selectedDate, selectedSlots)
    })
  }, [selectedDate, selectedSlots, lessonsByDate])

  const handleLessonUpdated = (updated: LessonSession) => {
    setLessons((prev) => {
      const idx = prev.findIndex((l) => l.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
  }

  const activeSlot = selectedSlots.find((s) => s.groupId === activeGroupId)
  const activeLesson = activeGroupId
    ? selectedLessons.find((l) => l.groupId === activeGroupId)
    : undefined

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-violet-600" />
              Lesson calendar
            </CardTitle>
            <CardDescription>
              {groupsWithSchedule.length === 0
                ? "Set a weekly schedule on each group to see lessons here"
                : `${lessonsThisWeek} lesson${lessonsThisWeek === 1 ? "" : "s"} this week across ${groupsWithSchedule.length} group${groupsWithSchedule.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          {onOpenGroups && (
            <button
              type="button"
              onClick={onOpenGroups}
              className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline"
            >
              Manage groups →
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <MonthPicker value={month} onChange={setMonth} showArrows className="mb-3" />
            {loading ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                <div className="mb-2 grid grid-cols-7 gap-0.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-6 animate-pulse rounded bg-slate-200" />
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2.5">
                <div className="mb-2 grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="h-6 leading-6">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {calendarDays.map((cell, idx) => {
                    if (!cell.date || cell.day == null) {
                      return <div key={`pad-${idx}`} className="h-10 w-10" />
                    }
                    const daySlots = slotsByDate.get(cell.date) ?? []
                    const dayLessons = lessonsByDate.get(cell.date) ?? []
                    const hasLesson = daySlots.length > 0
                    const allCanceled =
                      hasLesson &&
                      dayLessons.length > 0 &&
                      dayLessons.every((l) => l.canceled) &&
                      dayLessons.length >= daySlots.length
                    const allMarked =
                      hasLesson &&
                      !allCanceled &&
                      dayLessons.some((l) => l.attendanceMarked && !l.canceled)
                    const isToday = cell.date === today
                    const isSelected = cell.date === selectedDate

                    return (
                      <button
                        key={cell.date}
                        type="button"
                        onClick={() => setSelectedDate(cell.date!)}
                        className={cn(
                          "relative flex h-10 w-10 flex-col items-center justify-center rounded text-xs transition-colors",
                          isSelected && "z-10 ring-2 ring-inset ring-violet-600",
                          isToday && !isSelected && "ring-1 ring-inset ring-violet-400/60",
                          !hasLesson && "text-slate-500 hover:bg-slate-100",
                          hasLesson &&
                            allCanceled &&
                            "bg-rose-400 text-white hover:bg-rose-500",
                          hasLesson &&
                            !allCanceled &&
                            allMarked &&
                            "bg-emerald-500 text-white hover:bg-emerald-600",
                          hasLesson &&
                            !allCanceled &&
                            !allMarked &&
                            "border border-dashed border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200",
                        )}
                      >
                        <span className="font-semibold tabular-nums leading-none">{cell.day}</span>
                        {daySlots.length > 1 && (
                          <span className="absolute bottom-0.5 text-[8px] font-bold leading-none opacity-80">
                            {daySlots.length}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded border border-dashed border-amber-400 bg-amber-100" />
                Scheduled
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                Attendance done
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-rose-400" />
                Canceled
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {selectedDate === today ? "Today" : formatShortDate(selectedDate)}
              </p>
              {selectedSlots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No lessons scheduled for this day.
                </p>
              ) : (
                <>
                  {selectedSlots.length > 1 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedSlots.map((slot) => {
                        const lesson = selectedLessons.find((l) => l.groupId === slot.groupId)
                        const canceled = lesson?.canceled
                        const marked = lesson?.attendanceMarked && !canceled
                        const isActive = activeGroupId === slot.groupId
                        return (
                          <button
                            key={slot.groupId}
                            type="button"
                            onClick={() => setActiveGroupId(slot.groupId)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
                              isActive
                                ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                                : "border-slate-200 bg-white hover:bg-slate-50",
                            )}
                          >
                            <span className="font-medium text-slate-900">{slot.groupName}</span>
                            <span className="ml-2 text-slate-500">{slot.startTime}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {activeSlot && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {activeSlot.groupName}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {activeSlot.startTime}–{activeSlot.endTime}
                        </p>
                      </div>
                      {activeLesson?.canceled ? (
                        <Badge variant="secondary" className="shrink-0 bg-rose-50 text-rose-700">
                          Canceled
                        </Badge>
                      ) : activeLesson?.attendanceMarked ? (
                        <Badge variant="secondary" className="shrink-0 bg-emerald-50 text-emerald-700">
                          Done
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 bg-amber-50 text-amber-800">
                          Mark attendance
                        </Badge>
                      )}
                    </div>
                  )}

                  {activeGroupId && activeSlot && !activeLesson?.canceled && (
                    <LessonAttendanceEditor
                      groupId={activeGroupId}
                      date={selectedDate}
                      month={month}
                      lesson={activeLesson}
                      students={students}
                      onLessonUpdated={handleLessonUpdated}
                    />
                  )}

                  {activeLesson?.canceled && (
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {selectedSlots.map((slot) => {
                        const lesson = selectedLessons.find((l) => l.groupId === slot.groupId)
                        if (!lesson?.canceled) return null
                        return (
                          <li
                            key={`${slot.groupId}-${slot.date}`}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {slot.groupName}
                              </p>
                              <p className="text-xs text-slate-500">{lesson.cancelReason}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 bg-rose-50 text-rose-700">
                              Canceled
                            </Badge>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Coming up
              </p>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">No upcoming lessons in the next two weeks.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.slice(0, 6).map((slot) => (
                    <li
                      key={`${slot.date}-${slot.groupId}-${slot.startTime}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{slot.groupName}</p>
                        <p className="text-xs text-slate-500">
                          {slot.date === today
                            ? "Today"
                            : `${weekdayFullLabel(weekdayFromDate(slot.date))}, ${formatShortDate(slot.date)}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-slate-600">
                        {slot.startTime}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
