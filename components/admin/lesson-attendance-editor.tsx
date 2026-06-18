"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { lessonsApi } from "@/lib/api"
import type {
  AttendanceRecord,
  AttendanceStatus,
  LessonSession,
  Student,
} from "@/lib/admin-storage"
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

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

interface Props {
  groupId: string
  date: string
  month: string
  lesson: LessonSession | undefined
  students: Student[]
  onLessonUpdated: (lesson: LessonSession) => void
}

export function LessonAttendanceEditor({
  groupId,
  date,
  month,
  lesson,
  students,
  onLessonUpdated,
}: Props) {
  const { toast } = useToast()
  const groupStudents = useMemo(
    () => students.filter((s) => s.groupId === groupId),
    [students, groupId],
  )

  const [resolving, setResolving] = useState(false)
  const [activeLesson, setActiveLesson] = useState<LessonSession | null>(lesson ?? null)
  const [draftAttendance, setDraftAttendance] = useState<AttendanceRecord[]>([])
  const [draftTopic, setDraftTopic] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lesson) {
      setActiveLesson(lesson)
      return
    }

    let cancelled = false
    setResolving(true)
    void lessonsApi
      .list({ groupId, month })
      .then((data) => {
        if (cancelled) return
        setActiveLesson(data.find((l) => l.date === date) ?? null)
      })
      .catch(() => {
        if (!cancelled) setActiveLesson(null)
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [groupId, date, month, lesson])

  useEffect(() => {
    if (!activeLesson) {
      setDraftAttendance([])
      setDraftTopic("")
      return
    }
    const byStudent = new Map(activeLesson.attendance.map((a) => [a.studentId, a]))
    const marked = activeLesson.attendanceMarked === true
    setDraftAttendance(
      groupStudents.map((s) => {
        const prev = byStudent.get(s.id)
        return {
          studentId: s.id,
          status: marked ? prev?.status : undefined,
          notes: marked ? prev?.notes : undefined,
        }
      }),
    )
    setDraftTopic(activeLesson.topic ?? "")
  }, [activeLesson, groupStudents])

  const attendanceLocked = activeLesson?.canceled === true
  const allStatusesSelected = draftAttendance.every((row) => row.status)
  const topicFilled = draftTopic.trim().length > 0
  const attendanceAlreadySaved = activeLesson?.attendanceMarked === true

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setDraftAttendance((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row)),
    )
  }

  const markAllPresent = () => {
    if (attendanceLocked) return
    setDraftAttendance((prev) =>
      prev.map((row) => ({ ...row, status: "present" as AttendanceStatus })),
    )
  }

  const handleSave = async () => {
    if (!activeLesson || attendanceLocked) return
    if (!draftTopic.trim()) {
      toast({ title: "Topic is required", variant: "destructive" })
      return
    }
    if (!draftAttendance.every((row) => row.status)) {
      toast({ title: "Select attendance for every student", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const updated = await lessonsApi.update(activeLesson.id, {
        canceled: false,
        topic: draftTopic.trim(),
        attendance: draftAttendance as Array<AttendanceRecord & { status: AttendanceStatus }>,
      })
      setActiveLesson(updated)
      onLessonUpdated(updated)
      toast({ title: attendanceAlreadySaved ? "Attendance updated" : "Attendance saved" })
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

  if (resolving && !activeLesson) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    )
  }

  if (!activeLesson) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
        Could not load lesson for this day.
      </p>
    )
  }

  if (groupStudents.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
        No students in this group.
      </p>
    )
  }

  if (attendanceLocked) {
    return (
      <p className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-4 text-center text-sm text-rose-700">
        Lesson canceled — restore it in Groups to edit attendance.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor={`topic-${activeLesson.id}`} className="text-xs">
            Topic *
          </Label>
          <Input
            id={`topic-${activeLesson.id}`}
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
            placeholder="Lesson topic"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={markAllPresent}
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            All present
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!allStatusesSelected || !topicFilled}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Save className="mr-1 h-3.5 w-3.5" />
            {attendanceAlreadySaved ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100">
        {draftAttendance.map((row) => {
          const student = groupStudents.find((s) => s.id === row.studentId)
          return (
            <li key={row.studentId} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <div className="flex min-w-[140px] flex-1 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-[10px] font-bold text-white">
                  {initials(student?.name ?? "?")}
                </div>
                <p className="truncate text-sm font-medium text-slate-900">{student?.name ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setStudentStatus(row.studentId, opt.value)}
                    className={cn(
                      "h-7 min-w-[1.75rem] rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
                      row.status === opt.value ? opt.activeCls : opt.cls,
                    )}
                  >
                    {opt.short}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
