"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Plus, Trash2, Users, UserPlus, ArrowLeft, CalendarDays, Wallet } from "lucide-react"
import {
  addStudentToGroup,
  createGroup,
  deleteGroup,
  getGroupFinanceSummary,
  listGroups,
  listStudents,
  removeStudentFromGroup,
  updateGroup,
  type Group,
  type Student,
} from "@/lib/admin-storage"
import { StudentDetailModal } from "./student-detail-modal"
import { useToast } from "@/hooks/use-toast"
import { cn, formatMoney, formatThousands, parseDigits } from "@/lib/utils"

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
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [studentToAdd, setStudentToAdd] = useState("")
  const [studentDetail, setStudentDetail] = useState<Student | null>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    monthlyFee: 1_000_000,
  })

  const refresh = () => {
    setGroups(listGroups())
    setStudents(listStudents())
  }

  useEffect(() => {
    refresh()
  }, [])

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  )

  const groupStudents = useMemo(() => {
    if (!selectedGroup) return []
    return students.filter((s) => selectedGroup.studentIds.includes(s.id))
  }, [selectedGroup, students])

  const availableStudents = useMemo(() => {
    if (!selectedGroup) return []
    return students.filter((s) => !selectedGroup.studentIds.includes(s.id))
  }, [selectedGroup, students])

  const submitGroup = () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    createGroup({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      monthlyFee: Number(form.monthlyFee) || 0,
    })
    toast({ title: "Group created" })
    setForm({ name: "", description: "", monthlyFee: 1_000_000 })
    setShowCreate(false)
    refresh()
    onChanged?.()
  }

  const handleDeleteGroup = (g: Group) => {
    if (!confirm(`Delete group "${g.name}"? Students will be detached but kept.`)) return
    deleteGroup(g.id)
    setSelectedGroupId(null)
    refresh()
    onChanged?.()
  }

  const handleAddStudentToGroup = () => {
    if (!selectedGroup || !studentToAdd) return
    addStudentToGroup(selectedGroup.id, studentToAdd)
    setStudentToAdd("")
    setShowAddStudent(false)
    refresh()
    onChanged?.()
    toast({ title: "Student added to group" })
  }

  const handleRemoveStudent = (studentId: string) => {
    if (!selectedGroup) return
    removeStudentFromGroup(selectedGroup.id, studentId)
    refresh()
    onChanged?.()
  }

  // ----- Detail view -----
  if (selectedGroup) {
    const summary = getGroupFinanceSummary(selectedGroup.id)
    return (
      <>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedGroupId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to groups
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{selectedGroup.name}</CardTitle>
                  <CardDescription>{selectedGroup.description || "—"}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddStudent(true)}
                    disabled={availableStudents.length === 0}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add student
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteGroup(selectedGroup)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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

              {groupStudents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No students in this group yet.
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupStudents.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <button
                        type="button"
                        onClick={() => setStudentDetail(s)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C8102E] to-[#A00D25] text-xs font-bold text-white">
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{s.name}</p>
                          <p className="truncate text-xs text-slate-500">{s.email}</p>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStudent(s.id)}
                        className="text-slate-400 hover:text-rose-600"
                        aria-label={`Remove ${s.name} from group`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
              <Button onClick={handleAddStudentToGroup} disabled={!studentToAdd} className="bg-[#C8102E] hover:bg-[#A00D25]">
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
              <CardDescription>{groups.length} group{groups.length === 1 ? "" : "s"}</CardDescription>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreate(true)} className="bg-[#C8102E] hover:bg-[#A00D25]">
                <Plus className="h-4 w-4 mr-1.5" />
                New group
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-900">No groups yet</p>
              <p className="text-sm text-slate-500">Create a group and assign students to it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((g) => {
                const memberCount = g.studentIds.length
                const summary = getGroupFinanceSummary(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(g.id)}
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
                        <CalendarDays className="h-3 w-3" />
                        Created {new Date(g.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
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
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button onClick={submitGroup} className="bg-[#C8102E] hover:bg-[#A00D25]">
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
