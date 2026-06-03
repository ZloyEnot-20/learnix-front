"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  GraduationCap,
  Infinity,
  Headphones,
  History,
  Mic,
  PenTool,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import {
  createHomework,
  deleteHomework,
  ensureStudentAccount,
  ensureDemoHomework,
  listGroups,
  listHomework,
  listStudents,
  listSubmissions,
  type Group,
  type HomeworkAssignment,
  type HomeworkSubmission,
  type Student,
  type Subject,
} from "@/lib/admin-storage"
import {
  ensureGrammarSeed,
  listGrammarExercises,
} from "@/lib/grammar-storage"
import type { GrammarExercise } from "@/lib/grammar-types"
import { groupExercisesByTopic } from "@/lib/grammar-utils"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { HomeworkStudentResults } from "./homework-student-results"
import TopicStatsPanel from "./topic-stats-panel"

const DIFFICULTY_META: Record<
  GrammarExercise["difficulty"],
  { label: string; cls: string }
> = {
  easy: { label: "easy", cls: "bg-emerald-100 text-emerald-700" },
  medium: { label: "medium", cls: "bg-amber-100 text-amber-800" },
  hard: { label: "hard", cls: "bg-rose-100 text-rose-700" },
}

const SUBJECT_META: Record<Subject, { label: string; icon: typeof BookOpen; color: string }> = {
  reading: { label: "Reading", icon: BookOpen, color: "#c1bffd" },
  listening: { label: "Listening", icon: Headphones, color: "#ffcc3e" },
  writing: { label: "Writing", icon: PenTool, color: "#a7e237" },
  speaking: { label: "Speaking", icon: Mic, color: "#9fcffb" },
  grammar: { label: "Grammar", icon: GraduationCap, color: "#fcd5a4" },
}

interface HwRow {
  homework: HomeworkAssignment
  group?: Group
  total: number
  pending: number
  in_progress: number
  submitted: number
  graded: number
  done: number
  pct: number
  isPast: boolean
}

interface HomeworkManagerProps {
  createdByName: string
  onChanged?: () => void
}

export default function HomeworkManager({ createdByName, onChanged }: HomeworkManagerProps) {
  const { toast } = useToast()
  const [homework, setHomework] = useState<HomeworkAssignment[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([])
  const [, setStudents] = useState<Student[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const [search, setSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<"all" | Subject>("all")

  const [grammarExercises, setGrammarExercises] = useState<GrammarExercise[]>([])

  const [assignForm, setAssignForm] = useState<{
    groupId: string
    dueDate: string
    topic: string
    exerciseSlugs: string[]
    unlimited: boolean
    timeLimitMinutes: string
  }>({
    groupId: "",
    dueDate: defaultDueDate(),
    topic: "",
    exerciseSlugs: [],
    unlimited: true,
    timeLimitMinutes: "20",
  })

  const refresh = () => {
    setHomework(listHomework())
    setGroups(listGroups())
    setSubmissions(listSubmissions())
    setStudents(listStudents())
    setGrammarExercises(listGrammarExercises())
  }
  useEffect(() => {
    ensureGrammarSeed()
    // Make sure the demo student (Alex) is attached to a group so homework
    // assigned to that group reaches their dashboard, and always has one
    // pending demo assignment.
    ensureStudentAccount()
    ensureDemoHomework()
    refresh()
  }, [])

  const grammarTopics = useMemo(
    () => groupExercisesByTopic(grammarExercises).filter((t) => t.category === "grammar"),
    [grammarExercises],
  )

  const topicExerciseList = useMemo(() => {
    if (!assignForm.topic) return []
    return grammarExercises.filter((e) => e.topic === assignForm.topic)
  }, [grammarExercises, assignForm.topic])

  const toggleExercise = (slug: string) => {
    setAssignForm((prev) => {
      const has = prev.exerciseSlugs.includes(slug)
      return {
        ...prev,
        exerciseSlugs: has
          ? prev.exerciseSlugs.filter((s) => s !== slug)
          : [...prev.exerciseSlugs, slug],
      }
    })
  }

  const selectAllInTopic = () => {
    setAssignForm((prev) => ({
      ...prev,
      exerciseSlugs: topicExerciseList.map((e) => e.slug),
    }))
  }

  const clearExerciseSelection = () => {
    setAssignForm((prev) => ({ ...prev, exerciseSlugs: [] }))
  }

  const hwRows: HwRow[] = useMemo(() => {
    const now = Date.now()
    return homework.map((hw) => {
      const subs = submissions.filter((s) => s.homeworkId === hw.id)
      const total = subs.length
      const c = { pending: 0, in_progress: 0, submitted: 0, graded: 0 }
      for (const s of subs) c[s.status] += 1
      const done = c.submitted + c.graded
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return {
        homework: hw,
        group: groups.find((g) => g.id === hw.groupId),
        total,
        pending: c.pending,
        in_progress: c.in_progress,
        submitted: c.submitted,
        graded: c.graded,
        done,
        pct,
        isPast: new Date(hw.dueAt).getTime() < now,
      }
    })
  }, [homework, submissions, groups])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return hwRows
      .filter((r) => (groupFilter === "all" ? true : r.homework.groupId === groupFilter))
      .filter((r) => (subjectFilter === "all" ? true : r.homework.subject === subjectFilter))
      .filter((r) => {
        if (!q) return true
        return (
          r.homework.title.toLowerCase().includes(q) ||
          (r.group?.name.toLowerCase().includes(q) ?? false)
        )
      })
  }, [hwRows, search, groupFilter, subjectFilter])

  const activeRows = useMemo(
    () =>
      filteredRows
        .filter((r) => !r.isPast)
        .sort((a, b) => new Date(b.homework.createdAt).getTime() - new Date(a.homework.createdAt).getTime()),
    [filteredRows],
  )

  const historyRows = useMemo(
    () =>
      filteredRows
        .filter((r) => r.isPast)
        .sort((a, b) => new Date(b.homework.dueAt).getTime() - new Date(a.homework.dueAt).getTime()),
    [filteredRows],
  )

  const totals = useMemo(() => {
    const c = { total: submissions.length, pending: 0, in_progress: 0, submitted: 0, graded: 0 }
    for (const s of submissions) c[s.status] += 1
    return c
  }, [submissions])

  const groupStats = useMemo(() => {
    return groups.map((g) => {
      const groupRows = hwRows.filter((r) => r.homework.groupId === g.id)
      const total = groupRows.reduce((acc, r) => acc + r.total, 0)
      const done = groupRows.reduce((acc, r) => acc + r.done, 0)
      const pending = groupRows.reduce((acc, r) => acc + r.pending + r.in_progress, 0)
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      const activeCount = groupRows.filter((r) => !r.isPast).length
      return { group: g, total, done, pending, pct, activeCount }
    })
  }, [groups, hwRows])

  const submit = () => {
    if (!assignForm.groupId) {
      toast({ title: "Pick a group", variant: "destructive" })
      return
    }
    if (!assignForm.dueDate) {
      toast({ title: "Pick a due date", variant: "destructive" })
      return
    }
    if (!assignForm.topic) {
      toast({ title: "Pick a topic", variant: "destructive" })
      return
    }
    if (assignForm.exerciseSlugs.length === 0) {
      toast({ title: "Select at least one exercise", variant: "destructive" })
      return
    }
    const parsedLimit = Number.parseInt(assignForm.timeLimitMinutes, 10)
    if (!assignForm.unlimited && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      toast({ title: "Enter a valid time limit", variant: "destructive" })
      return
    }
    const timeLimitMinutes = assignForm.unlimited ? undefined : parsedLimit
    const dueIso = new Date(assignForm.dueDate).toISOString()
    let count = 0
    for (const slug of assignForm.exerciseSlugs) {
      const ex = grammarExercises.find((e) => e.slug === slug)
      if (!ex) continue
      createHomework({
        title: ex.title,
        description: ex.description,
        subject: "grammar",
        groupId: assignForm.groupId,
        dueAt: dueIso,
        estimatedMinutes: Math.max(1, ex.estimatedTime),
        createdBy: createdByName,
        exerciseSlug: ex.slug,
        timeLimitMinutes,
      })
      count += 1
    }
    toast({
      title:
        count === 1
          ? "1 exercise assigned to group"
          : `${count} exercises assigned to group`,
    })
    setShowCreate(false)
    setAssignForm({
      groupId: "",
      dueDate: defaultDueDate(),
      topic: "",
      exerciseSlugs: [],
      unlimited: true,
      timeLimitMinutes: "20",
    })
    refresh()
    onChanged?.()
  }

  const remove = (hw: HomeworkAssignment) => {
    if (!confirm(`Delete homework "${hw.title}" and all its submissions?`)) return
    deleteHomework(hw.id)
    refresh()
    onChanged?.()
  }

  const subjectFilters: Array<{ key: "all" | Subject; label: string }> = [
    { key: "all", label: "All subjects" },
    { key: "reading", label: "Reading" },
    { key: "listening", label: "Listening" },
    { key: "writing", label: "Writing" },
    { key: "speaking", label: "Speaking" },
    { key: "grammar", label: "Grammar" },
  ]

  const activeCountTotal = hwRows.filter((r) => !r.isPast).length
  const pastCountTotal = hwRows.filter((r) => r.isPast).length

  return (
    <>
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Homework status</h2>
              <p className="text-xs text-slate-500">
                {homework.length} assignment{homework.length === 1 ? "" : "s"} · {totals.total} student submission{totals.total === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowStats(true)}
                className="gap-1.5"
              >
                <BarChart3 className="h-4 w-4" />
                Statistics
                <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                  Soon
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowHistory(true)}
                disabled={pastCountTotal === 0}
                className="gap-1.5"
              >
                <History className="h-4 w-4" />
                Submissions history
                {pastCountTotal > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-700">
                    {pastCountTotal}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => setShowCreate(true)}
                disabled={groups.length === 0 || grammarExercises.length === 0}
                className="gap-1.5 bg-[#C8102E] hover:bg-[#A00D25]"
              >
                <Plus className="h-4 w-4" />
                Assign homework
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              icon={PlayCircle}
              label="Active tests"
              value={String(activeCountTotal)}
              accent="bg-sky-50 text-sky-700"
            />
            <Stat
              icon={History}
              label="Past tests"
              value={String(pastCountTotal)}
              accent="bg-slate-100 text-slate-700"
            />
            <Stat
              icon={Clock}
              label="Pending"
              value={String(totals.pending + totals.in_progress)}
              accent="bg-amber-50 text-amber-700"
            />
            <Stat
              icon={CheckCircle2}
              label="Graded"
              value={String(totals.graded)}
              accent="bg-emerald-50 text-emerald-700"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>By group</CardTitle>
                <CardDescription>
                  Click a group to filter the active tests table below
                </CardDescription>
              </div>
              {groupFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGroupFilter("all")}
                  className="gap-1.5 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Show all groups
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {groupStats.length === 0 ? (
              <p className="text-sm text-slate-500">No groups yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {groupStats.map(({ group, total, done, pending, pct, activeCount }) => {
                  const isSelected = groupFilter === group.id
                  const isDimmed = groupFilter !== "all" && !isSelected
                  return (
                    <button
                      key={group.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setGroupFilter(isSelected ? "all" : group.id)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
                        isSelected
                          ? "border-slate-900 bg-gradient-to-br from-slate-900/[0.04] to-emerald-100/40 ring-2 ring-slate-900 ring-offset-2 shadow-md"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm",
                        isDimmed && "opacity-60",
                      )}
                    >
                      {isSelected && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          Selected
                        </span>
                      )}
                      <div className={cn("flex items-start justify-between gap-2", isSelected && "pr-20")}>
                        <h3 className="truncate font-semibold text-slate-900">{group.name}</h3>
                        {!isSelected && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {pct}% done
                          </span>
                        )}
                      </div>
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <Mini label="Active" value={String(activeCount)} cls="text-sky-700" />
                        <Mini label="Subs" value={String(total)} cls="text-slate-700" />
                        <Mini label="Done" value={String(done)} cls="text-emerald-700" />
                        <Mini
                          label="Pending"
                          value={String(pending)}
                          cls={pending > 0 ? "text-amber-700" : "text-slate-400"}
                        />
                      </div>
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                          <Filter className="h-3 w-3" />
                          Filtering active tests by this group
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                      <PlayCircle className="h-3.5 w-3.5" />
                    </span>
                    Active tests
                  </span>
                  {groupFilter !== "all" && (
                    <GroupChip
                      name={groups.find((g) => g.id === groupFilter)?.name ?? "Group"}
                      onClear={() => setGroupFilter("all")}
                    />
                  )}
                </CardTitle>
                <CardDescription>
                  Currently assigned · click a row to expand the student list
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search homework or group…"
                    className="pl-9"
                  />
                </div>
                <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v as typeof subjectFilter)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectFilters.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <HomeworkTable
              rows={activeRows}
              emptyTitle="No active tests"
              emptyHint={
                groups.length === 0
                  ? "Create a group first, then assign homework to it."
                  : "Click \"Assign homework\" to assign your first task."
              }
              onChanged={() => {
                refresh()
                onChanged?.()
              }}
              onDelete={remove}
              mode="active"
            />
          </CardContent>
        </Card>
      </div>

      {/* Submissions history dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="!max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                <History className="h-4 w-4" />
              </span>
              Submissions history
            </DialogTitle>
            <DialogDescription>
              Previous tests · {historyRows.length} of {pastCountTotal} past assignment{pastCountTotal === 1 ? "" : "s"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search homework or group…"
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectFilter} onValueChange={(v) => setSubjectFilter(v as typeof subjectFilter)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectFilters.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <HomeworkTable
              rows={historyRows}
              emptyTitle="No previous tests"
              emptyHint="Past homework will be archived here when its due date passes."
              onChanged={() => {
                refresh()
                onChanged?.()
              }}
              onDelete={remove}
              mode="history"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign homework dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="!max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign homework</DialogTitle>
            <DialogDescription>
              Pick a group, a deadline, and one or more exercises from a topic. Each selected
              exercise becomes its own task for every student in the group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Group *</Label>
                <Select
                  value={assignForm.groupId}
                  onValueChange={(v) => setAssignForm((p) => ({ ...p, groupId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}{" "}
                        <span className="text-xs text-slate-500">
                          · {g.studentIds.length} student{g.studentIds.length === 1 ? "" : "s"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-due">Due date *</Label>
                <Input
                  id="hw-due"
                  type="date"
                  value={assignForm.dueDate}
                  onChange={(e) => setAssignForm((p) => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Time limit</Label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignForm((p) => ({ ...p, unlimited: !p.unlimited }))}
                  aria-pressed={assignForm.unlimited}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    assignForm.unlimited
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                  )}
                >
                  <Infinity className="h-3.5 w-3.5" />
                  Unlimited
                </button>
                {!assignForm.unlimited && (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        min={1}
                        value={assignForm.timeLimitMinutes}
                        onChange={(e) =>
                          setAssignForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))
                        }
                        className="h-9 w-24 pl-8"
                      />
                    </div>
                    <span className="text-xs text-slate-500">minutes</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {assignForm.unlimited
                  ? "Students can take as long as they need."
                  : "A countdown timer will be shown on the exercise page."}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Topic *</Label>
              <Select
                value={assignForm.topic}
                onValueChange={(v) =>
                  setAssignForm((p) => ({ ...p, topic: v, exerciseSlugs: [] }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      grammarTopics.length === 0 ? "No topics yet" : "Pick a topic"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {grammarTopics.map((t) => (
                    <SelectItem key={t.topic} value={t.topic}>
                      {t.title}{" "}
                      <span className="text-xs text-slate-500">
                        · {t.exerciseCount} exercise{t.exerciseCount === 1 ? "" : "s"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignForm.topic && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    Exercises *{" "}
                    <span className="text-xs font-normal text-slate-500">
                      ({assignForm.exerciseSlugs.length}/{topicExerciseList.length} selected)
                    </span>
                  </Label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllInTopic}
                      disabled={
                        topicExerciseList.length === 0 ||
                        assignForm.exerciseSlugs.length === topicExerciseList.length
                      }
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Select all
                    </button>
                    <span className="text-slate-300 text-xs">·</span>
                    <button
                      type="button"
                      onClick={clearExerciseSelection}
                      disabled={assignForm.exerciseSlugs.length === 0}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {topicExerciseList.length === 0 ? (
                    <p className="text-sm text-slate-500 px-3 py-6 text-center">
                      No exercises in this topic.
                    </p>
                  ) : (
                    topicExerciseList.map((ex) => {
                      const selected = assignForm.exerciseSlugs.includes(ex.slug)
                      const diff = DIFFICULTY_META[ex.difficulty]
                      return (
                        <label
                          key={ex.id}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                            selected ? "bg-slate-50" : "hover:bg-slate-50/60",
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => toggleExercise(ex.slug)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-slate-900 text-sm leading-snug">
                                {ex.title}
                              </p>
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                  diff.cls,
                                )}
                              >
                                {diff.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {ex.description}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                              <span>{ex.totalQuestions} questions</span>
                              <span>{ex.estimatedTime} min</span>
                              <span className="font-semibold text-slate-600">{ex.level}</span>
                            </div>
                          </div>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
            <Button
              onClick={submit}
              disabled={
                !assignForm.groupId ||
                !assignForm.topic ||
                assignForm.exerciseSlugs.length === 0
              }
              className="bg-[#C8102E] hover:bg-[#A00D25]"
            >
              Assign{" "}
              {assignForm.exerciseSlugs.length > 0
                ? `${assignForm.exerciseSlugs.length} exercise${
                    assignForm.exerciseSlugs.length === 1 ? "" : "s"
                  }`
                : "homework"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Topic statistics (preview / soon) */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Topic statistics
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Soon
              </span>
            </DialogTitle>
            <DialogDescription>
              Accuracy by topic and subtask — find where students struggle most.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto pr-1">
            <TopicStatsPanel />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HomeworkTable({
  rows,
  emptyTitle,
  emptyHint,
  onChanged,
  onDelete,
  mode,
}: {
  rows: HwRow[]
  emptyTitle: string
  emptyHint: string
  onChanged?: () => void
  onDelete: (hw: HomeworkAssignment) => void
  mode: "active" | "history"
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
        <p className="font-medium text-slate-900">{emptyTitle}</p>
        <p className="text-sm text-slate-500">{emptyHint}</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="py-3 px-3 font-semibold">Test</th>
            <th className="py-3 px-3 font-semibold">Group</th>
            <th className="py-3 px-3 font-semibold">Subject</th>
            <th className="py-3 px-3 font-semibold">{mode === "active" ? "Due" : "Closed"}</th>
            <th className="py-3 px-3 font-semibold">Progress</th>
            <th className="py-3 px-3 font-semibold">Pending</th>
            <th className="py-3 px-3 font-semibold">Graded</th>
            <th className="py-3 px-3 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const subjectMeta = SUBJECT_META[row.homework.subject]
            const SubjectIcon = subjectMeta.icon
            const due = new Date(row.homework.dueAt)
            const overdueActive =
              mode === "active" &&
              due.getTime() < Date.now() &&
              row.done < row.total
            const dueLabel = formatDue(due, mode)
            const isExpanded = expandedId === row.homework.id
            return (
              <Fragment key={row.homework.id}>
                <tr
                  onClick={() =>
                    setExpandedId((prev) => (prev === row.homework.id ? null : row.homework.id))
                  }
                  aria-expanded={isExpanded}
                  className={cn(
                    "cursor-pointer border-b transition-colors",
                    isExpanded
                      ? "border-blue-100 bg-blue-50/60 hover:bg-blue-50/80"
                      : cn(
                          "border-slate-100 hover:bg-slate-200/60",
                          idx % 2 === 1 ? "bg-slate-100/70" : "bg-white",
                        ),
                  )}
                >
                  <td className="py-3 px-3 max-w-xs">
                    <p className="truncate font-medium text-slate-900">{row.homework.title}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      Assigned {new Date(row.homework.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{row.group?.name ?? "—"}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-md ring-1 ring-black/5"
                        style={{ backgroundColor: subjectMeta.color }}
                      >
                        <SubjectIcon className="h-3 w-3 text-slate-900/80" />
                      </span>
                      <span className="text-xs text-slate-600">{subjectMeta.label}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs",
                        overdueActive
                          ? "font-semibold text-[#C8102E]"
                          : mode === "history"
                            ? "text-slate-500"
                            : "text-slate-700",
                      )}
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                      {dueLabel}
                    </span>
                  </td>
                  <td className="py-3 px-3 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            row.pct === 100
                              ? "bg-emerald-500"
                              : mode === "history"
                                ? "bg-slate-400"
                                : "bg-sky-500",
                          )}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-xs font-semibold tabular-nums text-slate-700">
                        {row.done}/{row.total}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {row.pending + row.in_progress > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Clock className="h-3 w-3" />
                        {row.pending + row.in_progress}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {row.graded > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <Sparkles className="h-3 w-3" />
                        {row.graded}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1 text-slate-400">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(row.homework)
                        }}
                        className="h-7 w-7 p-0 hover:text-rose-600"
                        aria-label="Delete homework"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-blue-100 bg-blue-50/30">
                    <td colSpan={8} className="p-0">
                      <ExpandableRowContent>
                        <div className="px-3 py-4 sm:px-4">
                          <HomeworkStudentResults
                            homework={row.homework}
                            onChanged={onChanged}
                          />
                        </div>
                      </ExpandableRowContent>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Smoothly animates its content open (0 → full height) when mounted. */
function ExpandableRowContent({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

function GroupChip({ name, onClear }: { name: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
      <Filter className="h-3 w-3" />
      {name}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClear()
        }}
        aria-label="Clear group filter"
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/15"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ClipboardList
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
        </div>
        <div
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            accent,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
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

function formatDue(due: Date, mode: "active" | "history") {
  const now = Date.now()
  const diff = due.getTime() - now
  const day = 24 * 60 * 60 * 1000
  const dateStr = due.toLocaleDateString()
  if (mode === "active") {
    if (diff < 0) return `Overdue · ${dateStr}`
    const days = Math.ceil(diff / day)
    if (days === 0) return `Today · ${dateStr}`
    if (days === 1) return `Tomorrow · ${dateStr}`
    if (days <= 7) return `In ${days}d · ${dateStr}`
    return dateStr
  }
  const daysAgo = Math.floor((now - due.getTime()) / day)
  if (daysAgo === 0) return `Today · ${dateStr}`
  if (daysAgo === 1) return `1 day ago · ${dateStr}`
  if (daysAgo <= 30) return `${daysAgo}d ago · ${dateStr}`
  return dateStr
}

function defaultDueDate(): string {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10)
}
