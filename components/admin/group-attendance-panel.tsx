"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Ban, CalendarDays, Check, Clock, Plus, RotateCcw, Save, Trash2, UserX } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MonthPicker } from "@/components/ui/month-picker"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TableSkeleton } from "./skeletons"
import { groupsApi, lessonsApi } from "@/lib/api"
import { filterLessonsForSchedule, lessonMatchesSchedule, normalizeWeekdays, scheduledDatesInMonth, weekdayFromDate, weekdayFullLabel } from "@/lib/lesson-schedule"
import { LessonScheduleDisplay } from "@/components/lesson-schedule-display"
import type { AttendanceRecord, AttendanceStatus, Group, LessonSession, Student } from "@/lib/admin-storage"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: {
  value: AttendanceStatus
  label: string
  short: string
  cls: string
  activeCls: string
}[] = [
  {
    value: "present",
    label: "Present",
    short: "P",
    cls: "text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    activeCls: "bg-emerald-600 text-white border-emerald-600",
  },
  {
    value: "late",
    label: "Late",
    short: "L",
    cls: "text-amber-700 border-amber-200 hover:bg-amber-50",
    activeCls: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "excused",
    label: "Excused",
    short: "E",
    cls: "text-sky-700 border-sky-200 hover:bg-sky-50",
    activeCls: "bg-sky-600 text-white border-sky-600",
  },
  {
    value: "absent",
    label: "Absent",
    short: "A",
    cls: "text-rose-700 border-rose-200 hover:bg-rose-50",
    activeCls: "bg-rose-600 text-white border-rose-600",
  },
]

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function parseMonth(month: string): { year: number; month: number } {
  const [year, m] = month.split("-").map(Number)
  return { year, month: m }
}

function countPresent(attendance: AttendanceRecord[]): number {
  return attendance.filter((a) => a.status === "present" || a.status === "late").length
}

function lessonDraftIsDirty(
  lesson: LessonSession,
  draftTopic: string,
  draftNotes: string,
  draftAttendance: AttendanceRecord[],
  students: Student[],
): boolean {
  if (draftTopic.trim() !== (lesson.topic ?? "").trim()) return true
  if (draftNotes.trim() !== (lesson.notes ?? "").trim()) return true

  const savedByStudent = new Map(lesson.attendance.map((row) => [row.studentId, row]))
  for (const student of students) {
    const draft = draftAttendance.find((row) => row.studentId === student.id)
    const saved = savedByStudent.get(student.id)
    const draftStatus = draft?.status
    const savedStatus = lesson.attendanceMarked ? saved?.status : undefined
    const draftNotesValue = draft?.notes?.trim() ?? ""
    const savedNotesValue = lesson.attendanceMarked ? saved?.notes?.trim() ?? "" : ""
    if (draftStatus !== savedStatus || draftNotesValue !== savedNotesValue) return true
  }
  return false
}

function formatLessonDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function pickDefaultDate(
  lessons: LessonSession[],
  scheduledDates: Set<string>,
  month: string,
): string | null {
  const today = todayDate()
  if (today.startsWith(month)) {
    if (lessons.some((l) => l.date === today) || scheduledDates.has(today)) return today
  }
  const lessonDates = new Set(lessons.map((l) => l.date))
  const candidates = [...new Set([...lessonDates, ...scheduledDates])].sort()
  if (candidates.length === 0) return null
  const upcoming = candidates.find((d) => d >= today)
  return upcoming ?? candidates[candidates.length - 1]
}

function pickSelectionAfterScheduleChange(
  prev: string | null,
  lessons: LessonSession[],
  scheduled: Set<string>,
  weekdays: number[],
  month: string,
): string | null {
  if (prev) {
    const inSchedule = weekdays.includes(weekdayFromDate(prev))
    const lesson = lessons.find((l) => l.date === prev)
    if (inSchedule && (lesson || scheduled.has(prev))) return prev
    if (lesson && lessonMatchesSchedule(lesson, weekdays)) return prev
  }
  return pickDefaultDate(lessons, scheduled, month)
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

type LessonRecurrence = "once" | "weekly"
type LessonDeleteScope = "single" | "weekday-future"

function sortWeekdays(days: number[]): number[] {
  return [...days].sort((a, b) => {
    const order = (d: number) => (d === 0 ? 7 : d)
    return order(a) - order(b)
  })
}

interface GroupAttendancePanelProps {
  group: Group
  students: Student[]
  /** Current lesson weekdays — kept in sync when the group schedule is edited. */
  lessonWeekdays?: number[]
  /** Bumped when group lesson weekdays change outside this panel. */
  scheduleRevision?: number
  onLessonsChanged?: () => void
  onGroupScheduleChanged?: (updated?: Group) => void | Promise<void>
}

export function GroupAttendancePanel({
  group,
  students,
  lessonWeekdays: lessonWeekdaysProp,
  scheduleRevision = 0,
  onLessonsChanged,
  onGroupScheduleChanged,
}: GroupAttendancePanelProps) {
  const { toast } = useToast()
  const [month, setMonth] = useState(currentMonth)
  const [lessons, setLessons] = useState<LessonSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectingDay, setSelectingDay] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [draftAttendance, setDraftAttendance] = useState<AttendanceRecord[]>([])
  const [draftTopic, setDraftTopic] = useState("")
  const [draftNotes, setDraftNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createDate, setCreateDate] = useState(todayDate)
  const [createTopic, setCreateTopic] = useState("")
  const [createRecurrence, setCreateRecurrence] = useState<LessonRecurrence>("once")
  const [creating, setCreating] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteScope, setDeleteScope] = useState<LessonDeleteScope>("single")
  const [deleting, setDeleting] = useState(false)
  const [cancelComment, setCancelComment] = useState("")
  const [showCancel, setShowCancel] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const resolveAttemptRef = useRef<string | null>(null)

  const propWeekdays = useMemo(
    () => normalizeWeekdays(lessonWeekdaysProp ?? group.lessonWeekdays),
    [lessonWeekdaysProp, group.lessonWeekdays, group.id],
  )
  const propWeekdaysKey = propWeekdays.join(",")

  const [weekdayOverride, setWeekdayOverride] = useState<number[] | null>(null)

  useEffect(() => {
    setWeekdayOverride(null)
  }, [group.id, propWeekdaysKey, scheduleRevision])

  const activeWeekdays = weekdayOverride ?? propWeekdays

  const scheduleKey = [
    activeWeekdays.join(","),
    group.lessonStartTime ?? "",
    group.lessonEndTime ?? "",
  ].join("|")
  const scheduleDisplay =
    activeWeekdays.length && group.lessonStartTime && group.lessonEndTime
      ? {
          weekdays: activeWeekdays,
          startTime: group.lessonStartTime,
          endTime: group.lessonEndTime,
        }
      : null

  const { year, month: monthNum } = parseMonth(month)
  const scheduledDates = useMemo(
    () => scheduledDatesInMonth(year, monthNum, activeWeekdays),
    [year, monthNum, scheduleKey],
  )

  const lessonsByDate = useMemo(() => {
    const map = new Map<string, LessonSession>()
    for (const lesson of lessons) {
      if (lessonMatchesSchedule(lesson, activeWeekdays)) {
        map.set(lesson.date, lesson)
      }
    }
    return map
  }, [lessons, scheduleKey])

  /** All lessons in the month — used for calendar colors (keeps conducted days on old weekdays). */
  const calendarLessonsByDate = useMemo(() => {
    const map = new Map<string, LessonSession>()
    for (const lesson of lessons) {
      map.set(lesson.date, lesson)
    }
    return map
  }, [lessons])

  const selectedLesson = selectedDate ? lessonsByDate.get(selectedDate) ?? null : null

  const loadLessons = useCallback(async () => {
    resolveAttemptRef.current = null
    setLessons([])
    setLoading(true)
    try {
      const data = await lessonsApi.list({ groupId: group.id, month })
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      setLessons(sorted)
      const scheduled = scheduledDatesInMonth(
        parseMonth(month).year,
        parseMonth(month).month,
        activeWeekdays,
      )
      const visible = filterLessonsForSchedule(sorted, activeWeekdays)
      setSelectedDate((prev) =>
        pickSelectionAfterScheduleChange(prev, visible, scheduled, activeWeekdays, month),
      )
    } catch (err) {
      toast({
        title: "Could not load lessons",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
      setLessons([])
      setSelectedDate(null)
    } finally {
      setLoading(false)
    }
  }, [group.id, activeWeekdays, month, scheduleKey, scheduleRevision, toast])

  useEffect(() => {
    void loadLessons()
  }, [loadLessons])

  useEffect(() => {
    resolveAttemptRef.current = null
    setLoading(true)
  }, [scheduleKey, month])

  useEffect(() => {
    if (loading || !selectedDate || selectedLesson) return
    if (!scheduledDates.has(selectedDate)) return

    const attemptKey = `${scheduleKey}:${month}:${selectedDate}`
    if (resolveAttemptRef.current === attemptKey) return
    resolveAttemptRef.current = attemptKey

    let cancelled = false
    setSelectingDay(true)
    void resolveLessonForDate(selectedDate).finally(() => {
      if (!cancelled) setSelectingDay(false)
    })
    return () => {
      cancelled = true
    }
  }, [loading, selectedDate, selectedLesson, scheduleKey, month, scheduledDates])

  useEffect(() => {
    if (!selectedLesson) {
      setDraftAttendance([])
      setDraftTopic("")
      setDraftNotes("")
      setCancelComment("")
      return
    }
    const byStudent = new Map(selectedLesson.attendance.map((a) => [a.studentId, a]))
    const marked = selectedLesson.attendanceMarked === true
    setDraftAttendance(
      students.map((s) => {
        const prev = byStudent.get(s.id)
        return {
          studentId: s.id,
          status: marked ? prev?.status : undefined,
          notes: marked ? prev?.notes : undefined,
        }
      }),
    )
    setDraftTopic(selectedLesson.topic ?? "")
    setDraftNotes(selectedLesson.notes ?? "")
  }, [selectedLesson, students])

  const resolveLessonForDate = async (date: string): Promise<LessonSession | null> => {
    const cached = lessonsByDate.get(date)
    if (cached) return cached
    if (!scheduledDates.has(date)) return null
    try {
      const data = await lessonsApi.list({ groupId: group.id, month })
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      setLessons(sorted)
      return filterLessonsForSchedule(sorted, activeWeekdays).find((l) => l.date === date) ?? null
    } catch {
      return null
    }
  }

  const selectDay = async (date: string) => {
    setSelectedDate(date)
    if (lessonsByDate.get(date)) return

    if (scheduledDates.has(date)) {
      setSelectingDay(true)
      await resolveLessonForDate(date)
      setSelectingDay(false)
    }
  }

  const openCreateDialog = (date?: string) => {
    const target = date ?? selectedDate ?? todayDate()
    setCreateDate(target)
    setCreateTopic("")
    setCreateRecurrence(scheduledDates.has(target) ? "weekly" : "once")
    setShowCreate(true)
  }

  const createWeekday = weekdayFromDate(createDate)
  const createWeekdayLabel = weekdayFullLabel(createWeekday)
  const weekdayAlreadyScheduled = activeWeekdays.includes(createWeekday)

  const handleCreate = async () => {
    setCreating(true)
    try {
      if (createRecurrence === "weekly") {
        const currentWeekdays = activeWeekdays
        const wasAlreadyScheduled = currentWeekdays.includes(createWeekday)
        let nextWeekdays = currentWeekdays
        if (!wasAlreadyScheduled) {
          nextWeekdays = sortWeekdays([...currentWeekdays, createWeekday])
          setWeekdayOverride(nextWeekdays)
          const updatedGroup = await groupsApi.update(group.id, {
            lessonWeekdays: nextWeekdays,
            ...(group.lessonStartTime ? { lessonStartTime: group.lessonStartTime } : {}),
            ...(group.lessonEndTime ? { lessonEndTime: group.lessonEndTime } : {}),
          })
          nextWeekdays = normalizeWeekdays(updatedGroup.lessonWeekdays ?? nextWeekdays)
          setWeekdayOverride(nextWeekdays)
          await onGroupScheduleChanged?.(updatedGroup)
        }

        const data = await lessonsApi.list({ groupId: group.id, month })
        const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
        const visible = filterLessonsForSchedule(sorted, nextWeekdays)
        let lesson = visible.find((l) => l.date === createDate)
        if (lesson && createTopic.trim()) {
          lesson = await lessonsApi.update(lesson.id, { topic: createTopic.trim() })
          sorted.splice(
            sorted.findIndex((l) => l.id === lesson!.id),
            1,
            lesson,
          )
        }
        setLessons(sorted)
        if (!lesson) {
          throw new Error("Could not create lessons for this weekday")
        }
        setShowCreate(false)
        setSelectedDate(createDate)
        onLessonsChanged?.()
        toast({
          title: wasAlreadyScheduled
            ? "Weekly lessons ready"
            : `${createWeekdayLabel} added to schedule`,
        })
        return
      }

      const lesson = await lessonsApi.create({
        groupId: group.id,
        date: createDate,
        topic: createTopic.trim() || undefined,
      })
      setLessons((prev) => [lesson, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setShowCreate(false)
      setSelectedDate(createDate)
      onLessonsChanged?.()
      toast({ title: "Lesson created" })
    } catch (err) {
      toast({
        title: "Could not create lesson",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSave = async () => {
    if (!selectedLesson || selectedLesson.canceled) return
    if (!lessonDraftIsDirty(selectedLesson, draftTopic, draftNotes, draftAttendance, students)) return
    if (!draftTopic.trim()) {
      toast({ title: "Topic is required", variant: "destructive" })
      return
    }
    if (!draftAttendance.every((row) => row.status)) {
      toast({ title: "Select attendance for every student", variant: "destructive" })
      return
    }

    const isUpdate = selectedLesson.attendanceMarked === true
    setSaving(true)
    try {
      const updated = await lessonsApi.update(selectedLesson.id, {
        canceled: false,
        topic: draftTopic.trim(),
        notes: draftNotes.trim() || undefined,
        attendance: draftAttendance as Array<AttendanceRecord & { status: AttendanceStatus }>,
      })
      setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      onLessonsChanged?.()
      toast({ title: isUpdate ? "Attendance updated" : "Attendance saved" })
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const openCancelDialog = () => {
    if (selectedLesson?.canceled) return
    setCancelComment("")
    setShowCancel(true)
  }

  const applyCancelLesson = async () => {
    if (!selectedLesson) return
    const comment = cancelComment.trim()
    if (!comment) {
      toast({ title: "Cancellation comment is required", variant: "destructive" })
      return
    }
    setCanceling(true)
    try {
      const updated = await lessonsApi.update(selectedLesson.id, {
        canceled: true,
        cancelReason: comment,
      })
      setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      setShowCancel(false)
      onLessonsChanged?.()
      toast({ title: "Lesson canceled" })
    } catch (err) {
      toast({
        title: "Could not cancel lesson",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCanceling(false)
    }
  }

  const markAllPresent = () => {
    if (selectedLesson?.canceled) return
    setDraftAttendance((prev) =>
      prev.map((row) => ({ ...row, status: "present" as AttendanceStatus })),
    )
  }

  const handleRestoreLesson = async () => {
    if (!selectedLesson) return
    setRestoring(true)
    try {
      const updated = await lessonsApi.update(selectedLesson.id, { canceled: false })
      setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      onLessonsChanged?.()
      toast({ title: "Lesson restored" })
    } catch (err) {
      toast({
        title: "Could not restore lesson",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRestoring(false)
    }
  }

  const openDeleteDialog = () => {
    setDeleteScope("single")
    setShowDelete(true)
  }

  const handleDeleteLesson = async () => {
    if (!selectedLesson) return
    setDeleting(true)
    try {
      const result = await lessonsApi.remove(selectedLesson.id, { scope: deleteScope })
      setShowDelete(false)
      await loadLessons()
      onLessonsChanged?.()
      toast({
        title:
          deleteScope === "weekday-future"
            ? `${result.deletedCount} lessons deleted`
            : "Lesson deleted",
      })
    } catch (err) {
      toast({
        title: "Could not delete lesson",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  const deleteWeekdayLabel = selectedLesson
    ? weekdayFullLabel(weekdayFromDate(selectedLesson.date))
    : ""

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setDraftAttendance((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row)),
    )
  }

  const setStudentNote = (studentId: string, notes: string) => {
    setDraftAttendance((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, notes } : row)),
    )
  }

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const calendarDays = useMemo(() => {
    const first = new Date(year, monthNum - 1, 1)
    const lastDay = new Date(year, monthNum, 0).getDate()
    const startPad = (first.getDay() + 6) % 7
    const cells: Array<{ date: string | null; day: number | null }> = []
    for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null })
    for (let d = 1; d <= lastDay; d++) {
      const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      cells.push({ date, day: d })
    }
    return cells
  }, [year, monthNum])

  const hasSchedule = activeWeekdays.length > 0
  const presentCount = countPresent(draftAttendance)
  const allStatusesSelected = draftAttendance.every((row) => row.status)
  const topicFilled = draftTopic.trim().length > 0
  const panelLoading = loading || selectingDay
  const attendanceLocked = selectedLesson?.canceled === true
  const isDirty = selectedLesson
    ? lessonDraftIsDirty(selectedLesson, draftTopic, draftNotes, draftAttendance, students)
    : false
  const attendanceAlreadySaved = selectedLesson?.attendanceMarked === true

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-violet-600" />
                Lessons & attendance
              </CardTitle>
              <CardDescription className="mt-1">
                Select a day on the calendar, then mark attendance for each student.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCreateDialog()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Extra lesson
              </Button>
            </div>
          </div>
          {scheduleDisplay ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-violet-100 bg-violet-50/60 px-2 py-1">
              <Clock className="h-3 w-3 shrink-0 text-violet-600" />
              <LessonScheduleDisplay schedule={scheduleDisplay} size="xs" />
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            {/* Calendar — left */}
            <div className="w-[312px] shrink-0">
              <MonthPicker
                value={month}
                onChange={setMonth}
                showArrows
                className="mb-2"
              />
              {loading ? (
                <div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="h-10 w-10 rounded bg-slate-100 animate-pulse" />
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
                      const lesson = calendarLessonsByDate.get(cell.date)
                      const isScheduled = scheduledDates.has(cell.date)
                      const onCurrentSchedule = lesson
                        ? lessonMatchesSchedule(lesson, activeWeekdays)
                        : isScheduled
                      const isLessonDay = onCurrentSchedule || (lesson?.attendanceMarked === true) || lesson?.canceled === true
                      const isCanceled = lesson?.canceled === true
                      const attendanceMarked = lesson?.attendanceMarked === true
                      const isToday = cell.date === todayDate()
                      const isSelected = selectedDate === cell.date

                      return (
                        <button
                          key={cell.date}
                          type="button"
                          title={
                            isCanceled
                              ? "Lesson canceled"
                              : attendanceMarked
                                ? "Attendance marked"
                                : isLessonDay
                                  ? "Attendance not marked yet"
                                  : "No lesson"
                          }
                          onClick={() => void selectDay(cell.date!)}
                          className={cn(
                            "relative flex h-10 w-10 flex-col items-center justify-center rounded text-xs transition-colors",
                            isSelected && "z-10 ring-2 ring-inset",
                            isSelected &&
                              attendanceMarked &&
                              !isCanceled &&
                              "ring-white/90",
                            isSelected &&
                              isCanceled &&
                              "ring-white/90",
                            isSelected &&
                              !attendanceMarked &&
                              isLessonDay &&
                              !isCanceled &&
                              "ring-amber-600",
                            isSelected &&
                              !isLessonDay &&
                              !isCanceled &&
                              "ring-slate-400",
                            isToday && !isSelected && "ring-1 ring-inset ring-primary/50",
                            isCanceled
                              ? isSelected
                                ? "bg-rose-500 text-white ring-2 ring-inset ring-rose-600"
                                : "bg-rose-400 text-white hover:bg-rose-500"
                              : attendanceMarked
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : isLessonDay
                                  ? isScheduled && !lesson
                                    ? "border border-dashed border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                  : isSelected
                                    ? "bg-slate-100 text-slate-700"
                                    : "text-slate-600 hover:bg-slate-100",
                          )}
                        >
                          <span className="font-semibold tabular-nums leading-none">{cell.day}</span>
                          {isCanceled && (
                            <Ban className="absolute bottom-0.5 h-2.5 w-2.5 text-white/90" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Students — right */}
            <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white">
              {panelLoading ? (
                <div className="p-4">
                  <TableSkeleton rows={Math.max(students.length, 4)} columns={3} />
                </div>
              ) : !selectedDate ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
                  <CalendarDays className="h-8 w-8 text-slate-300" />
                  <p className="font-medium text-slate-700">Select a lesson day</p>
                  <p className="text-xs text-slate-400">
                    {hasSchedule
                      ? "Click a highlighted day on the calendar."
                      : "Set weekdays in Edit group, or add an extra lesson."}
                  </p>
                </div>
              ) : !selectedLesson ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-8">
                  <div className="text-center sm:text-left">
                    <p className="font-medium text-slate-700">{formatLessonDate(selectedDate)}</p>
                    <p className="mt-1 text-xs text-slate-400">No lesson for this day yet.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openCreateDialog(selectedDate)}
                    className="shrink-0 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add lesson?
                  </Button>
                </div>
              ) : students.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-slate-500">
                  <UserX className="h-8 w-8 text-slate-300" />
                  <p>No students in this group.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatLessonDate(selectedDate)}
                      </p>
                      {selectedLesson.canceled ? (
                        <p className="text-xs font-medium text-rose-600">Lesson canceled</p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {presentCount}/{draftAttendance.length} present or late
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedLesson.canceled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRestoreLesson}
                          loading={restoring}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Restore lesson
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openCancelDialog}
                          className="text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Lesson canceled
                        </Button>
                      )}
                      {!selectedLesson.canceled ? (
                        <Button
                          size="sm"
                          onClick={handleSave}
                          loading={saving}
                          disabled={!isDirty || !allStatusesSelected || !topicFilled}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          {attendanceAlreadySaved ? "Update" : "Save"}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={openDeleteDialog}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {selectedLesson.canceled ? (
                    <div className="border-b border-rose-100 bg-rose-50/60 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                        Cancellation comment
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{selectedLesson.cancelReason}</p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor={`topic-${selectedLesson.id}`} className="text-xs">
                        Topic *
                      </Label>
                      <Input
                        id={`topic-${selectedLesson.id}`}
                        value={draftTopic}
                        onChange={(e) => setDraftTopic(e.target.value)}
                        placeholder="Lesson topic"
                        className="h-8 text-sm"
                        disabled={attendanceLocked}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor={`notes-${selectedLesson.id}`} className="text-xs">
                        Notes
                      </Label>
                      <Textarea
                        id={`notes-${selectedLesson.id}`}
                        rows={2}
                        value={draftNotes}
                        onChange={(e) => setDraftNotes(e.target.value)}
                        placeholder="Homework, materials…"
                        className="text-sm"
                        disabled={attendanceLocked}
                      />
                    </div>
                  </div>

                  {!selectedLesson.canceled ? (
                    <div className="flex justify-end border-b border-slate-100 px-4 py-2">
                      <Button
                        size="sm"
                        onClick={markAllPresent}
                        disabled={attendanceLocked || selectedLesson.canceled}
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        All present
                      </Button>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 px-4 font-semibold">Student</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftAttendance.map((row) => {
                          const student = studentById.get(row.studentId)
                          return (
                            <tr
                              key={row.studentId}
                              className={cn(
                                "border-b border-slate-50 last:border-0",
                                attendanceLocked && "opacity-60",
                              )}
                            >
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-[10px] font-bold text-white">
                                    {initials(student?.name ?? "?")}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900 text-sm">
                                      {student?.name ?? "Unknown"}
                                    </p>
                                    {student?.login && (
                                      <p className="truncate text-[11px] text-slate-400">
                                        {student.login}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {STATUS_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      title={opt.label}
                                      disabled={attendanceLocked}
                                      onClick={() => setStudentStatus(row.studentId, opt.value)}
                                      className={cn(
                                        "h-7 min-w-[1.75rem] rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
                                        row.status === opt.value ? opt.activeCls : opt.cls,
                                        attendanceLocked && "cursor-not-allowed",
                                      )}
                                    >
                                      {opt.short}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <Input
                                  value={row.notes ?? ""}
                                  onChange={(e) => setStudentNote(row.studentId, e.target.value)}
                                  placeholder="Optional"
                                  className="h-8 text-xs max-w-[180px]"
                                  disabled={attendanceLocked}
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add lesson</DialogTitle>
            <DialogDescription>
              {formatLessonDate(createDate)} — choose how often this lesson should repeat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-date">Date</Label>
              <Input
                id="lesson-date"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Repeat</Label>
              <RadioGroup
                value={createRecurrence}
                onValueChange={(v) => setCreateRecurrence(v as LessonRecurrence)}
                className="gap-2"
              >
                <label
                  htmlFor="recurrence-once"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    createRecurrence === "once"
                      ? "border-violet-300 bg-violet-50/50"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <RadioGroupItem value="once" id="recurrence-once" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">This date only</p>
                    <p className="text-xs text-slate-500">One extra lesson, not part of the weekly schedule.</p>
                  </div>
                </label>
                <label
                  htmlFor="recurrence-weekly"
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    createRecurrence === "weekly"
                      ? "border-violet-300 bg-violet-50/50"
                      : "border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <RadioGroupItem value="weekly" id="recurrence-weekly" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Every week on {createWeekdayLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {weekdayAlreadyScheduled
                        ? `Fills all ${createWeekdayLabel}s in this month from the group schedule.`
                        : `Adds ${createWeekdayLabel} to the group schedule and creates lessons each week.`}
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lesson-topic">Topic (optional)</Label>
              <Input
                id="lesson-topic"
                value={createTopic}
                onChange={(e) => setCreateTopic(e.target.value)}
                placeholder="e.g. Speaking practice"
              />
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button onClick={handleCreate} loading={creating} className="bg-primary hover:bg-primary/90">
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lesson</DialogTitle>
            <DialogDescription>
              {selectedLesson
                ? `${formatLessonDate(selectedLesson.date)} — choose what to remove.`
                : "Choose what to remove."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Scope</Label>
            <RadioGroup
              value={deleteScope}
              onValueChange={(v) => setDeleteScope(v as LessonDeleteScope)}
              className="gap-2"
            >
              <label
                htmlFor="delete-single"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  deleteScope === "single"
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <RadioGroupItem value="single" id="delete-single" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Only this lesson</p>
                  <p className="text-xs text-slate-500">
                    Removes attendance for this date only. Other lessons stay.
                  </p>
                </div>
              </label>
              <label
                htmlFor="delete-weekday-future"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  deleteScope === "weekday-future"
                    ? "border-rose-300 bg-rose-50/50"
                    : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <RadioGroupItem value="weekday-future" id="delete-weekday-future" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    This and all future {deleteWeekdayLabel} lessons
                  </p>
                  <p className="text-xs text-slate-500">
                    Deletes this lesson and every later lesson on the same weekday in the group.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button
              variant="destructive"
              onClick={handleDeleteLesson}
              loading={deleting}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancel} onOpenChange={setShowCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lesson canceled</DialogTitle>
            <DialogDescription>
              {selectedLesson
                ? `${formatLessonDate(selectedLesson.date)} — explain why the lesson did not take place.`
                : "Explain why the lesson did not take place."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-comment">Comment *</Label>
            <Textarea
              id="cancel-comment"
              rows={3}
              value={cancelComment}
              onChange={(e) => setCancelComment(e.target.value)}
              placeholder="e.g. Teacher ill, public holiday, room unavailable…"
              className="text-sm"
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button
              onClick={() => void applyCancelLesson()}
              loading={canceling}
              disabled={!cancelComment.trim()}
              className="bg-slate-700 hover:bg-slate-800"
            >
              Apply
            </Button>
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
