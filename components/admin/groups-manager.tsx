"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, Users, UserPlus, ArrowLeft, CalendarDays, Wallet, Clock, Pencil, Phone, Search } from "lucide-react"
import type { Group, LessonSession, Payment, StaffUser, Student } from "@/lib/admin-storage"
import { groupMemberCount, studentsInGroup } from "@/lib/admin-storage"
import { getGroupSummaries, invalidateGroups } from "@/lib/admin-cache"
import { useAdminData } from "@/lib/admin-data-context"
import { isEntryTestGroup, selectableGroups } from "@/lib/entry-test-group"
import { groupsApi, lessonsApi, paymentsApi, usersApi } from "@/lib/api"
import { normalizeLessonSchedulePayload, filterLessonsForSchedule, groupToLessonSchedule } from "@/lib/lesson-schedule"
import { LessonScheduleDisplay } from "@/components/lesson-schedule-display"
import {
  createEmptyLessonSchedule,
  LessonScheduleFields,
  validateLessonScheduleForm,
  type LessonScheduleFormValues,
} from "./lesson-schedule-fields"
import { CardGridSkeleton, TableSkeleton } from "./skeletons"
import { StudentDetailModal } from "./student-detail-modal"
import { GroupAttendancePanel } from "./group-attendance-panel"
import { useToast } from "@/hooks/use-toast"
import { useAuth, isAdminType } from "@/lib/auth-context"
import { cn, formatMoney, formatThousands, parseDigits } from "@/lib/utils"
import {
  attendanceRateBadgeCls,
  computeStudentAttendanceRates,
} from "@/lib/attendance-stats"
import {
  currentPeriodMonth,
  PAYMENT_STATUS_META,
  periodMonthOf,
} from "@/lib/payment-period"

interface GroupSummary {
  expectedTotal: number
  paidTotal: number
  overdueTotal: number
  pendingTotal: number
}
const EMPTY_SUMMARY: GroupSummary = {
  expectedTotal: 0,
  paidTotal: 0,
  overdueTotal: 0,
  pendingTotal: 0,
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

interface GroupsManagerProps {
  canCreate?: boolean
  onChanged?: () => void
}

export default function GroupsManager({ canCreate = true, onChanged }: GroupsManagerProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const showTeacherPicker = user ? isAdminType(user.type) : false
  const router = useRouter()
  const params = useParams<{ section?: string[] }>()
  const { students, groups, ready, refreshAll, refreshGroups, refreshStudents, patchGroup, patchStudent } =
    useAdminData()
  const manageableGroups = useMemo(() => selectableGroups(groups), [groups])
  const selectedGroupId = useMemo(() => {
    const parts = Array.isArray(params.section) ? params.section : []
    if (parts[0] !== "groups" || !parts[1]) return null
    return parts[1]
  }, [params.section])
  const openGroup = useCallback(
    (id: string) => {
      router.push(`/admin/groups/${id}`)
    },
    [router],
  )
  const [summaries, setSummaries] = useState<Record<string, GroupSummary>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [studentToAdd, setStudentToAdd] = useState("")
  const [studentDetail, setStudentDetail] = useState<Student | null>(null)
  const [creating, setCreating] = useState(false)
  const [addingStudent, setAddingStudent] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [studentSearch, setStudentSearch] = useState("")
  const [attendanceScheduleRevision, setAttendanceScheduleRevision] = useState(0)
  const closeGroup = useCallback(() => {
    setStudentSearch("")
    router.push("/admin/groups")
  }, [router])
  const [groupLessons, setGroupLessons] = useState<LessonSession[]>([])
  const [groupPayments, setGroupPayments] = useState<Payment[]>([])
  const [studentMetaLoading, setStudentMetaLoading] = useState(false)
  const [teachers, setTeachers] = useState<StaffUser[]>([])
  const [teachersLoading, setTeachersLoading] = useState(false)

  type GroupFormState = {
    name: string
    description: string
    monthlyFee: number
    teacherId: string
  } & LessonScheduleFormValues

  const createEmptyGroupForm = useCallback(
    (): GroupFormState => ({
      name: "",
      description: "",
      monthlyFee: 1_000_000,
      teacherId: "",
      ...createEmptyLessonSchedule(),
    }),
    [],
  )

  const [form, setForm] = useState<GroupFormState>(() => createEmptyGroupForm())

  const [editForm, setEditForm] = useState<GroupFormState>(() => createEmptyGroupForm())

  function groupToScheduleForm(group: Group): LessonScheduleFormValues {
    return normalizeLessonSchedulePayload({
      lessonWeekdays: group.lessonWeekdays ?? [],
      lessonStartTime: group.lessonStartTime ?? "10:00",
      lessonEndTime: group.lessonEndTime ?? "12:00",
    })
  }

  function openEditDialog(group: Group) {
    const fromList = groups.find((item) => item.id === group.id) ?? group
    setEditForm({
      name: fromList.name,
      description: fromList.description ?? "",
      monthlyFee: fromList.monthlyFee ?? 0,
      teacherId: fromList.teacherId ?? "",
      ...groupToScheduleForm(fromList),
    })
    setShowEdit(true)
  }

  function openCreateDialog() {
    setForm(createEmptyGroupForm())
    setShowCreate(true)
  }

  function closeCreateDialog() {
    setShowCreate(false)
    setForm(createEmptyGroupForm())
  }

  const loadTeachers = useCallback(async () => {
    if (!showTeacherPicker) return
    setTeachersLoading(true)
    try {
      const users = await usersApi.list()
      setTeachers(users.filter((u) => u.type === "teacher"))
    } catch {
      setTeachers([])
    } finally {
      setTeachersLoading(false)
    }
  }, [showTeacherPicker])

  useEffect(() => {
    void loadTeachers()
  }, [loadTeachers])

  useEffect(() => {
    if (showCreate || showEdit) void loadTeachers()
  }, [showCreate, showEdit, loadTeachers])

  const teacherNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const teacher of teachers) map.set(teacher.id, teacher.name)
    return map
  }, [teachers])

  const loadSummaries = async (groupList: Group[], force = false) => {
    const data = await getGroupSummaries(
      groupList.map((g) => g.id),
      force,
    )
    setSummaries(data)
  }

  useEffect(() => {
    void refreshGroups(true)
  }, [refreshGroups])

  useEffect(() => {
    if (groups.length === 0) {
      setSummaries({})
      return
    }
    void loadSummaries(groups, true)
  }, [groups])

  const summaryFor = (id: string): GroupSummary => summaries[id] ?? EMPTY_SUMMARY

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  useEffect(() => {
    if (!selectedGroupId || !ready) return
    const group = groups.find((g) => g.id === selectedGroupId)
    if (!group || isEntryTestGroup(group)) {
      router.replace("/admin/groups")
    }
  }, [selectedGroupId, groups, ready, router])

  const groupStudents = useMemo(() => {
    if (!selectedGroup) return []
    return studentsInGroup(students, selectedGroup.id)
  }, [selectedGroup, students])

  const availableStudents = useMemo(() => {
    if (!selectedGroup) return []
    const groupId = String(selectedGroup.id)
    return students.filter((s) => String(s.groupId ?? "") !== groupId)
  }, [selectedGroup, students])

  const filteredGroupStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return groupStudents
    return groupStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.login.toLowerCase().includes(q) ||
        (s.email?.toLowerCase().includes(q) ?? false) ||
        (s.phone?.toLowerCase().includes(q) ?? false),
    )
  }, [groupStudents, studentSearch])

  const loadStudentMeta = useCallback(async (groupOverride?: Group) => {
    const group = groupOverride ?? selectedGroup
    if (!group || isEntryTestGroup(group)) return
    setStudentMetaLoading(true)
    try {
      const weekdays = group.lessonWeekdays ?? []
      const [lessons, payments] = await Promise.all([
        lessonsApi.list({ groupId: group.id }),
        paymentsApi.list({ groupId: group.id }),
      ])
      setGroupLessons(filterLessonsForSchedule(lessons, weekdays))
      setGroupPayments(payments)
    } catch {
      setGroupLessons([])
      setGroupPayments([])
    } finally {
      setStudentMetaLoading(false)
    }
  }, [selectedGroup])

  useEffect(() => {
    void loadStudentMeta()
  }, [loadStudentMeta])

  const attendanceByStudent = useMemo(
    () => computeStudentAttendanceRates(
      groupLessons,
      groupStudents.map((s) => ({
        id: s.id,
        groupJoinedAt: s.groupJoinedAt ?? s.joinedAt,
      })),
    ),
    [groupLessons, groupStudents],
  )

  const paymentPeriod = currentPeriodMonth()

  const submitGroup = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const scheduleError = validateLessonScheduleForm(form)
    if (scheduleError) {
      toast({ title: scheduleError, variant: "destructive" })
      return
    }
    if (showTeacherPicker && !form.teacherId) {
      toast({ title: "Select a teacher", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const schedule = normalizeLessonSchedulePayload(form)
      await groupsApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyFee: Number(form.monthlyFee) || 0,
        ...(showTeacherPicker ? { teacherId: form.teacherId } : {}),
        ...schedule,
      })
      invalidateGroups()
      toast({ title: "Group created" })
      closeCreateDialog()
      const { groups: nextGroups } = await refreshAll(true)
      await loadSummaries(nextGroups, true)
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not create group",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const submitEditGroup = async () => {
    if (!selectedGroup) return
    if (!editForm.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const scheduleError = validateLessonScheduleForm(editForm)
    if (scheduleError) {
      toast({ title: scheduleError, variant: "destructive" })
      return
    }
    if (showTeacherPicker && !editForm.teacherId) {
      toast({ title: "Select a teacher", variant: "destructive" })
      return
    }
    setUpdating(true)
    try {
      const schedule = normalizeLessonSchedulePayload(editForm)
      const updated = await groupsApi.update(selectedGroup.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        monthlyFee: Number(editForm.monthlyFee) || 0,
        ...(showTeacherPicker ? { teacherId: editForm.teacherId } : {}),
        ...schedule,
      })
      patchGroup(updated)
      invalidateGroups()
      toast({ title: "Group updated" })
      setShowEdit(false)
      setAttendanceScheduleRevision((n) => n + 1)
      await refreshGroups(true)
      await loadStudentMeta(updated)
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not update group",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleAddStudentToGroup = async () => {
    if (!selectedGroup || !studentToAdd) return
    const previousStudent = students.find((s) => s.id === studentToAdd)
    setAddingStudent(true)
    try {
      await groupsApi.addMember(selectedGroup.id, studentToAdd)
      patchStudent(studentToAdd, {
        groupId: selectedGroup.id,
        groupJoinedAt: new Date().toISOString(),
        ...(typeof selectedGroup.monthlyFee === "number"
          ? { monthlyFee: selectedGroup.monthlyFee }
          : {}),
      })
      invalidateGroups()
      setStudentToAdd("")
      setShowAddStudent(false)
      const { groups: nextGroups } = await refreshAll(true)
      await loadSummaries(nextGroups, true)
      onChanged?.()
      toast({ title: "Student added to group" })
    } catch (err) {
      if (previousStudent) {
        patchStudent(studentToAdd, {
          groupId: previousStudent.groupId,
          groupJoinedAt: previousStudent.groupJoinedAt,
          monthlyFee: previousStudent.monthlyFee,
        })
      }
      toast({
        title: "Could not add student",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setAddingStudent(false)
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedGroup) return
    setRemovingId(studentId)
    try {
      await groupsApi.removeMember(selectedGroup.id, studentId)
      invalidateGroups()
      const { groups: nextGroups } = await refreshAll(true)
      await loadSummaries(nextGroups, true)
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not remove student",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  // ----- Detail view -----
  if (selectedGroupId && !selectedGroup) {
    if (!ready) {
      return (
        <div className="space-y-5">
          <div className="h-8 w-36 rounded-md bg-slate-100 animate-pulse" />
          <div className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
          <TableSkeleton rows={6} columns={4} />
        </div>
      )
    }
    return null
  }

  if (selectedGroup && !isEntryTestGroup(selectedGroup)) {
    const summary = summaryFor(selectedGroup.id)
    const schedule = groupToLessonSchedule(selectedGroup)
    return (
      <>
        <div className="space-y-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeGroup}
            className="-ml-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to groups
          </Button>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50/80 via-white to-sky-50/60 p-6 shadow-sm">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl"
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {selectedGroup.name}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                    <Users className="mr-1 h-3 w-3" />
                    {groupStudents.length} student{groupStudents.length === 1 ? "" : "s"}
                  </span>
                </div>
                {selectedGroup.description ? (
                  <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
                    {selectedGroup.description}
                  </p>
                ) : null}
                {showTeacherPicker && selectedGroup.teacherId ? (
                  <p className="mt-1.5 text-sm text-slate-600">
                    Teacher:{" "}
                    <span className="font-medium text-slate-800">
                      {teacherNameById.get(selectedGroup.teacherId) ?? "—"}
                    </span>
                  </p>
                ) : null}
                {schedule ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-200/80 bg-white/70 px-3 py-1.5 shadow-sm">
                    <Clock className="h-4 w-4 shrink-0 text-violet-500" />
                    <LessonScheduleDisplay schedule={schedule} />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedGroup)}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowAddStudent(true)}
                  disabled={availableStudents.length === 0}
                  className="bg-primary hover:bg-primary/90"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Add student
                </Button>
              </div>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatChip
                icon={Users}
                label="Students"
                value={String(groupStudents.length)}
                cls="bg-sky-50 text-sky-700"
              />
              <StatChip
                icon={Wallet}
                label="Expected"
                value={formatMoney(summary.expectedTotal)}
                cls="bg-slate-100 text-slate-700"
              />
              <StatChip
                icon={Wallet}
                label="Collected"
                value={formatMoney(summary.paidTotal)}
                cls="bg-emerald-50 text-emerald-700"
              />
              <StatChip
                icon={Wallet}
                label="Overdue"
                value={formatMoney(summary.overdueTotal)}
                cls={summary.overdueTotal > 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"}
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Students</CardTitle>
                  <CardDescription>
                    {filteredGroupStudents.length} of {groupStudents.length} shown
                  </CardDescription>
                </div>
                {groupStudents.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students…"
                      className="pl-9"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {groupStudents.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
                  <div className="rounded-full bg-white p-3 shadow-sm">
                    <Users className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">No students yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add students to start tracking payments and attendance.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowAddStudent(true)}
                    disabled={availableStudents.length === 0}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add student
                  </Button>
                </div>
              ) : studentMetaLoading ? (
                <TableSkeleton rows={Math.max(groupStudents.length, 4)} columns={7} />
              ) : filteredGroupStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No students match your search.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-3 font-semibold">Student</th>
                        <th className="py-3 px-3 font-semibold">Phone</th>
                        <th className="py-3 px-3 font-semibold">Monthly fee</th>
                        <th className="py-3 px-3 font-semibold">Payment</th>
                        <th className="py-3 px-3 font-semibold">Attendance</th>
                        <th className="py-3 px-3 font-semibold">Joined</th>
                        <th className="py-3 px-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGroupStudents.map((s) => {
                        const payment = groupPayments.find(
                          (p) =>
                            p.studentId === s.id && periodMonthOf(p) === paymentPeriod,
                        )
                        const paymentMeta = payment
                          ? PAYMENT_STATUS_META[payment.status]
                          : { label: "No invoice", cls: "bg-slate-50 text-slate-400 border border-dashed border-slate-200" }
                        const attendance = attendanceByStudent.get(s.id)
                        return (
                        <tr
                          key={s.id}
                          onClick={() => setStudentDetail(s)}
                          className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-xs font-bold text-white">
                                {initials(s.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">{s.name}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {s.login}
                                  {s.email ? ` · ${s.email}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 tabular-nums">
                            {s.phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {s.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3 px-3 tabular-nums text-slate-700">
                            {formatMoney(s.monthlyFee ?? selectedGroup.monthlyFee ?? 0)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                                paymentMeta.cls,
                              )}
                            >
                              {paymentMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {attendance?.rate != null ? (
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                                  attendanceRateBadgeCls(attendance.rate),
                                )}
                                title={`${attendance.attended} of ${attendance.total} lessons`}
                              >
                                {attendance.rate}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(s.groupJoinedAt ?? s.joinedAt).toLocaleDateString()}
                          </td>
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStudent(s.id)}
                              loading={removingId === s.id}
                              className="text-slate-400 hover:text-rose-600"
                              aria-label={`Remove ${s.name} from group`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <GroupAttendancePanel
            group={selectedGroup}
            lessonWeekdays={selectedGroup.lessonWeekdays ?? []}
            students={groupStudents}
            scheduleRevision={attendanceScheduleRevision}
            onLessonsChanged={loadStudentMeta}
            onGroupScheduleChanged={async (updated) => {
              if (updated) patchGroup(updated)
              setAttendanceScheduleRevision((n) => n + 1)
              await refreshGroups(true)
              await loadStudentMeta(updated ?? selectedGroup)
            }}
          />
        </div>

        <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add student to group</DialogTitle>
              <DialogDescription>Pick an existing student.</DialogDescription>
            </DialogHeader>
            <Select value={studentToAdd} onValueChange={setStudentToAdd}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {availableStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
              <Button onClick={handleAddStudentToGroup} loading={addingStudent} disabled={!studentToAdd} className="bg-primary hover:bg-primary/90">
                Add
              </Button>
              <Button variant="outline" onClick={() => setShowAddStudent(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <StudentDetailModal
          student={studentDetail}
          open={!!studentDetail}
          onOpenChange={(open) => !open && setStudentDetail(null)}
        />

        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit group</DialogTitle>
              <DialogDescription>Update group details and lesson schedule.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="eg-name">Group name *</Label>
                <Input
                  id="eg-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eg-desc">Description</Label>
                <Textarea
                  id="eg-desc"
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eg-fee">Default monthly fee (som)</Label>
                <Input
                  id="eg-fee"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={formatThousands(editForm.monthlyFee)}
                  onChange={(e) =>
                    setEditForm({ ...editForm, monthlyFee: parseDigits(e.target.value) })
                  }
                  className="tabular-nums"
                />
              </div>
              {showTeacherPicker ? (
                <TeacherSelectField
                  id="eg-teacher"
                  value={editForm.teacherId}
                  teachers={teachers}
                  loading={teachersLoading}
                  onChange={(teacherId) => setEditForm({ ...editForm, teacherId })}
                />
              ) : null}
              <LessonScheduleFields
                idPrefix="edit-schedule"
                value={editForm}
                onChange={(schedule) => setEditForm((prev) => ({ ...prev, ...schedule }))}
              />
            </div>
            <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
              <Button onClick={submitEditGroup} loading={updating} className="bg-primary hover:bg-primary/90">
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ----- Groups list -----
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>{manageableGroups.length} group{manageableGroups.length === 1 ? "" : "s"}</CardDescription>
            </div>
            {canCreate && (
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1.5" />
                New group
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!ready && groups.length === 0 ? (
            <CardGridSkeleton count={4} columns={2} />
          ) : manageableGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">No groups yet</p>
              <p className="text-sm text-slate-500">Create a group and assign students to it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {manageableGroups.map((g) => {
                const memberCount = groupMemberCount(students, g.id)
                const summary = summaryFor(g.id)
                const schedule = groupToLessonSchedule(g)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => openGroup(g.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-200/40 blur-2xl"
                    />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-900">{g.name}</h3>
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                            {g.description || "No description"}
                          </p>
                          {showTeacherPicker && g.teacherId ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Teacher: {teacherNameById.get(g.teacherId) ?? "—"}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {memberCount} student{memberCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <Mini label="Expected" value={formatMoney(summary.expectedTotal)} cls="text-slate-700" />
                        <Mini label="Collected" value={formatMoney(summary.paidTotal)} cls="text-emerald-700" />
                        <Mini
                          label="Overdue"
                          value={formatMoney(summary.overdueTotal)}
                          cls={summary.overdueTotal > 0 ? "text-rose-700" : "text-slate-400"}
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                        {schedule ? (
                          <>
                            <Clock className="h-3 w-3 shrink-0" />
                            <LessonScheduleDisplay schedule={schedule} size="xs" timeClassName="text-slate-500" />
                          </>
                        ) : (
                          <>
                            <CalendarDays className="h-3 w-3" />
                            Created {new Date(g.createdAt).toLocaleDateString()}
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (open) openCreateDialog()
          else closeCreateDialog()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a group</DialogTitle>
            <DialogDescription>Groups are used to assign homework and track payments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Group name *</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="IELTS 7.0 — Morning"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea
                id="g-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description of the group"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-fee">Default monthly fee (som)</Label>
              <Input
                id="g-fee"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formatThousands(form.monthlyFee)}
                onChange={(e) =>
                  setForm({ ...form, monthlyFee: parseDigits(e.target.value) })
                }
                placeholder="1 000 000"
                className="tabular-nums"
              />
            </div>
            {showTeacherPicker ? (
              <TeacherSelectField
                id="g-teacher"
                value={form.teacherId}
                teachers={teachers}
                loading={teachersLoading}
                onChange={(teacherId) => setForm({ ...form, teacherId })}
              />
            ) : null}
            <LessonScheduleFields
              idPrefix="create-schedule"
              value={form}
              onChange={(schedule) => setForm((prev) => ({ ...prev, ...schedule }))}
            />
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button onClick={submitGroup} loading={creating} className="bg-primary hover:bg-primary/90">
              Create
            </Button>
            <Button variant="outline" onClick={closeCreateDialog}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TeacherSelectField({
  id,
  value,
  teachers,
  loading,
  onChange,
}: {
  id: string
  value: string
  teachers: StaffUser[]
  loading: boolean
  onChange: (teacherId: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Assigned teacher *</Label>
      {loading ? (
        <div className="h-10 animate-pulse rounded-md bg-slate-100" aria-hidden />
      ) : teachers.length === 0 ? (
        <p className="text-sm text-amber-700">
          No teachers in this organization. Add a teacher in Users first.
        </p>
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Select a teacher" />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
                {teacher.login ? ` (@${teacher.login})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

function StatChip({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: typeof Users
  label: string
  value: string
  cls: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", cls)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

function Mini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("font-semibold tabular-nums", cls)}>{value}</p>
    </div>
  )
}
