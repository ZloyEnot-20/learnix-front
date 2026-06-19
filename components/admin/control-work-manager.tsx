"use client"

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookMarked,
  BookOpen,
  CalendarClock,
  ChevronRight,
  GraduationCap,
  GripVertical,
  Headphones,
  Infinity,
  Layers,
  PenTool,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react"
import type {
  ControlWork,
  ControlWorkStep,
  ControlWorkSubject,
  ControlWorkSubmission,
  HomeworkStatus,
  Student,
} from "@/lib/admin-storage"
import { studentsInGroup } from "@/lib/admin-storage"
import { useAdminData } from "@/lib/admin-data-context"
import { selectableGroups } from "@/lib/entry-test-group"
import { TableSkeleton } from "./skeletons"
import { controlWorkApi, exercisesApi } from "@/lib/api"
import { groupExercisesByTopic } from "@/lib/grammar-utils"
import type { VocabDeck } from "@/lib/vocabulary-data"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ControlWorkStudentModal } from "@/components/admin/control-work-student-modal"
import { cn } from "@/lib/utils"

const SECTION_META: Record<
  ControlWorkSubject,
  { label: string; icon: typeof BookOpen; color: string }
> = {
  vocabulary: { label: "Vocabulary", icon: BookMarked, color: "#d8b4fe" },
  grammar: { label: "Grammar", icon: GraduationCap, color: "#fcd5a4" },
  reading: { label: "Reading", icon: BookOpen, color: "#c1bffd" },
  listening: { label: "Listening", icon: Headphones, color: "#ffcc3e" },
  writing: { label: "Writing", icon: PenTool, color: "#a7e237" },
}

const DEFAULT_ORDER: ControlWorkSubject[] = [
  "vocabulary",
  "grammar",
  "reading",
  "listening",
  "writing",
]

const IELTS_SKILL_SECTIONS = new Set<ControlWorkSubject>(["reading", "listening", "writing"])

function uniqueSectionSubjects(steps: ControlWorkStep[]): ControlWorkSubject[] {
  const seen = new Set<ControlWorkSubject>()
  const ordered: ControlWorkSubject[] = []
  for (const step of steps) {
    if (seen.has(step.subject)) continue
    seen.add(step.subject)
    ordered.push(step.subject)
  }
  return ordered
}

function stepIndicesForSubject(steps: ControlWorkStep[], subject: ControlWorkSubject): number[] {
  return steps.reduce<number[]>((acc, step, index) => {
    if (step.subject === subject) acc.push(index)
    return acc
  }, [])
}

function formatSubjectCell(
  sub: ControlWorkSubmission | undefined,
  steps: ControlWorkStep[],
  subject: ControlWorkSubject,
): { label: string; tone: "muted" | "active" | "done" | "danger" } {
  const indices = stepIndicesForSubject(steps, subject)
  if (!sub || indices.length === 0) return { label: "—", tone: "muted" }

  let correct = 0
  let total = 0
  let anyCompleted = false
  let anyInProgress = false
  let anyCheating = false

  for (const idx of indices) {
    const result = sub.stepResults?.[idx]
    if (!result || result.status === "pending") {
      if (sub.status === "in_progress" && sub.currentStep === idx) {
        anyInProgress = true
      }
      continue
    }
    anyCompleted = true
    if (result.attempt?.failedDueToCheating) {
      anyCheating = true
      continue
    }
    const stepTotal = result.attempt?.totalQuestions ?? 0
    if (stepTotal > 0) {
      total += stepTotal
      correct += result.attempt?.correctCount ?? 0
    }
  }

  if (anyCheating && total === 0 && !anyCompleted) {
    return { label: "Cheating", tone: "danger" }
  }
  if (total > 0) {
    return {
      label: `${correct}/${total}`,
      tone: anyInProgress ? "active" : "done",
    }
  }
  if (anyCompleted) return { label: "Done", tone: "done" }
  if (anyInProgress) return { label: "In progress", tone: "active" }
  return { label: "—", tone: "muted" }
}

function SectionBadge({
  subject,
  label,
  className,
}: {
  subject: ControlWorkSubject
  label?: string
  className?: string
}) {
  const meta = SECTION_META[subject]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-slate-900/80",
        className,
      )}
      style={{ backgroundColor: meta.color }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label ?? meta.label}
    </span>
  )
}

function SectionColumnHeader({ subject }: { subject: ControlWorkSubject }) {
  const meta = SECTION_META[subject]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center justify-center gap-1">
      <Icon className="h-3 w-3 shrink-0 text-slate-400" />
      {meta.label}
    </span>
  )
}

interface SectionConfig {
  enabled: boolean
  mode: "manual" | "mix"
  topicSlugs: string[]
  exerciseSlugs: string[]
  deckSlugs: string[]
  mixCount: number
  testId: string
}

function defaultSectionConfig(): SectionConfig {
  return {
    enabled: false,
    mode: "manual",
    topicSlugs: [],
    exerciseSlugs: [],
    deckSlugs: [],
    mixCount: 2,
    testId: "",
  }
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function formatShortDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const STATUS_META: Record<HomeworkStatus, { label: string; cls: string; dot: string }> = {
  pending: { label: "Not started", cls: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  paused: { label: "Paused", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  submitted: { label: "Submitted", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  graded: { label: "Graded", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
}

const CHEATING_STATUS_META = {
  label: "Cheating",
  cls: "bg-red-100 text-red-800",
  dot: "bg-red-500",
}

const STATUS_RANK: Record<HomeworkStatus, number> = {
  graded: 0,
  submitted: 1,
  in_progress: 2,
  paused: 3,
  pending: 4,
}

type ResultsSortKey = "student" | "status" | "overall" | ControlWorkSubject
type SortDir = "asc" | "desc"

function submissionStatusMeta(sub?: ControlWorkSubmission) {
  if (sub?.integrityStatus === "cheating_detected") return CHEATING_STATUS_META
  const status = (sub?.status ?? "pending") as HomeworkStatus
  return STATUS_META[status]
}

function StatusBadge({ meta }: { meta: { label: string; cls: string; dot: string } }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        meta.cls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}

function stepCellClass(tone: ReturnType<typeof formatSubjectCell>["tone"]) {
  return cn(
    "tabular-nums",
    tone === "muted" && "text-slate-400",
    tone === "active" && "font-medium text-amber-700",
    tone === "done" && "font-medium text-slate-800",
    tone === "danger" && "font-semibold text-red-700",
  )
}

function submissionOverallPct(sub: ControlWorkSubmission | undefined): number | null {
  if (!sub?.stepResults?.length) return null
  let correct = 0
  let total = 0
  for (const sr of sub.stepResults) {
    if (sr.status !== "completed" || !sr.attempt) continue
    if (sr.attempt.failedDueToCheating) return null
    total += sr.attempt.totalQuestions ?? 0
    correct += sr.attempt.correctCount ?? 0
  }
  if (total <= 0) return null
  return Math.round((correct / total) * 100)
}

function subjectAccuracyRatio(
  sub: ControlWorkSubmission | undefined,
  steps: ControlWorkStep[],
  subject: ControlWorkSubject,
): number {
  const indices = stepIndicesForSubject(steps, subject)
  let correct = 0
  let total = 0
  for (const idx of indices) {
    const sr = sub?.stepResults?.[idx]
    if (sr?.status !== "completed" || !sr.attempt) continue
    const stepTotal = sr.attempt.totalQuestions ?? 0
    if (stepTotal <= 0) continue
    total += stepTotal
    correct += sr.attempt.correctCount ?? 0
  }
  if (total <= 0) return -1
  return correct / total
}

function statusSortRank(sub?: ControlWorkSubmission): number {
  if (sub?.integrityStatus === "cheating_detected") return -1
  const status = (sub?.status ?? "pending") as HomeworkStatus
  return STATUS_RANK[status] ?? 99
}

function overallSortValue(sub?: ControlWorkSubmission): number {
  const pct = submissionOverallPct(sub)
  if (pct != null) return pct
  if (sub?.status === "submitted" || sub?.status === "graded") return -0.5
  return -1
}

function SortableTh({
  label,
  active,
  dir,
  onSort,
  align = "left",
  sticky = false,
}: {
  label: ReactNode
  active: boolean
  dir: SortDir
  onSort: () => void
  align?: "left" | "center"
  sticky?: boolean
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th
      className={cn(
        "py-2 font-semibold align-middle",
        align === "center" ? "px-2 text-center" : "px-3 text-left",
        sticky && "sticky left-0 z-[1] bg-slate-50",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSort()
        }}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-slate-800",
          active && "text-slate-800",
          align === "center" && "mx-auto",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3 shrink-0", active ? "text-slate-700" : "text-slate-400")} />
      </button>
    </th>
  )
}

function accuracyClass(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 60) return "bg-sky-100 text-sky-800"
  if (pct >= 40) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

function ControlWorkStudentResults({
  cw,
  students,
  submissions,
}: {
  cw: ControlWork
  students: Student[]
  submissions: ControlWorkSubmission[]
}) {
  const sectionSubjects = useMemo(() => uniqueSectionSubjects(cw.steps), [cw.steps])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [sortKey, setSortKey] = useState<ResultsSortKey>("status")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const members = useMemo(
    () => studentsInGroup(students, cw.groupId),
    [students, cw.groupId],
  )

  const toggleSort = (key: ResultsSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    if (key === "student" || key === "status") {
      setSortDir("asc")
    } else {
      setSortDir("desc")
    }
  }

  const sortedMembers = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...members].sort((a, b) => {
      const subA = submissions.find((s) => s.studentId === a.id)
      const subB = submissions.find((s) => s.studentId === b.id)
      let cmp = 0

      switch (sortKey) {
        case "student":
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          break
        case "status":
          cmp = statusSortRank(subA) - statusSortRank(subB)
          break
        case "overall":
          cmp = overallSortValue(subA) - overallSortValue(subB)
          break
        default:
          cmp =
            subjectAccuracyRatio(subA, cw.steps, sortKey) -
            subjectAccuracyRatio(subB, cw.steps, sortKey)
          break
      }

      if (cmp !== 0) return cmp * dir
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })
  }, [members, submissions, cw.steps, sortKey, sortDir])

  const selectedSubmission = useMemo(
    () =>
      selectedStudent
        ? submissions.find((s) => s.studentId === selectedStudent.id)
        : undefined,
    [selectedStudent, submissions],
  )

  if (members.length === 0) {
    return <p className="text-xs text-slate-500">No students in this group.</p>
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-28" />
            {sectionSubjects.map((subject) => (
              <col key={`${cw.id}-col-${subject}`} />
            ))}
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
              <SortableTh
                label="Student"
                active={sortKey === "student"}
                dir={sortDir}
                onSort={() => toggleSort("student")}
                sticky
              />
              <SortableTh
                label="Status"
                active={sortKey === "status"}
                dir={sortDir}
                onSort={() => toggleSort("status")}
                align="center"
              />
              {sectionSubjects.map((subject) => (
                <SortableTh
                  key={`${cw.id}-head-${subject}`}
                  label={<SectionColumnHeader subject={subject} />}
                  active={sortKey === subject}
                  dir={sortDir}
                  onSort={() => toggleSort(subject)}
                  align="center"
                />
              ))}
              <SortableTh
                label="Overall"
                active={sortKey === "overall"}
                dir={sortDir}
                onSort={() => toggleSort("overall")}
                align="center"
              />
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((student) => {
              const sub = submissions.find((s) => s.studentId === student.id)
              const cheating = sub?.integrityStatus === "cheating_detected"
              const overallPct = cheating ? null : submissionOverallPct(sub)
              const statusMeta = submissionStatusMeta(sub)
              return (
                <tr
                  key={student.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedStudent(student)
                  }}
                  className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                >
                  <td className="sticky left-0 z-[1] bg-white py-2 px-3 text-left align-middle group-hover:bg-slate-50">
                    <div className="font-medium text-slate-900">{student.name}</div>
                  </td>
                  <td className="py-2 px-2 text-center align-middle">
                    <StatusBadge meta={statusMeta} />
                  </td>
                  {sectionSubjects.map((subject) => {
                    const cell = formatSubjectCell(sub, cw.steps, subject)
                    return (
                      <td
                        key={`${student.id}-${subject}`}
                        className="py-2 px-2 text-center align-middle"
                      >
                        <span className={stepCellClass(cell.tone)}>{cell.label}</span>
                      </td>
                    )
                  })}
                  <td className="py-2 px-2 text-center align-middle">
                    {cheating ? (
                      <span className="font-semibold text-red-700">—</span>
                    ) : overallPct != null ? (
                      <span
                        className={cn(
                          "inline-flex min-w-[2.75rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          accuracyClass(overallPct),
                          sub?.status === "in_progress" && "opacity-80",
                        )}
                      >
                        {overallPct}%
                      </span>
                    ) : sub?.status === "submitted" || sub?.status === "graded" ? (
                      <span className="text-slate-600">Submitted</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ControlWorkStudentModal
        cw={cw}
        student={selectedStudent}
        submission={selectedSubmission}
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
      />
    </>
  )
}

function SortableSectionCard({
  subject,
  enabled,
  onEnabledChange,
  comingSoon = false,
  children,
}: {
  subject: ControlWorkSubject
  enabled: boolean
  onEnabledChange: (checked: boolean) => void
  comingSoon?: boolean
  children: ReactNode
}) {
  const meta = SECTION_META[subject]
  const Icon = meta.icon
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subject,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border p-3",
        enabled ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50/80",
        isDragging &&
          "cursor-grabbing shadow-2xl ring-2 ring-slate-200/80 scale-[1.02] rotate-[0.5deg]",
        !isDragging && "transition-[box-shadow,border-color] duration-200",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${meta.label}`}
          className={cn(
            "flex h-7 w-7 shrink-0 touch-none items-center justify-center rounded-md",
            "text-slate-400 transition-colors duration-150",
            "cursor-grab hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing",
          )}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={enabled}
          disabled={comingSoon}
          onCheckedChange={(c) => !comingSoon && onEnabledChange(c === true)}
        />
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: meta.color }}
        >
          <Icon className="h-3.5 w-3.5 text-slate-900/80" />
        </span>
        <span className="flex-1 font-semibold text-slate-900">{meta.label}</span>
        {comingSoon && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Soon
          </span>
        )}
      </div>
      {!isDragging ? children : null}
    </div>
  )
}

export default function ControlWorkManager({
  createdByName,
  onChanged,
}: {
  createdByName: string
  onChanged?: () => void
}) {
  const { toast } = useToast()
  const { groups, students, exercises: grammarExercises } = useAdminData()
  const assignableGroups = useMemo(() => selectableGroups(groups), [groups])
  const [items, setItems] = useState<ControlWork[]>([])
  const [submissions, setSubmissions] = useState<ControlWorkSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ControlWork | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [mountedIds, setMountedIds] = useState<Record<string, boolean>>({})

  const toggleExpanded = (controlWorkId: string) => {
    const expanding = !expandedIds[controlWorkId]
    if (expanding) {
      setMountedIds((prev) => ({ ...prev, [controlWorkId]: true }))
      setExpandedIds((prev) => ({ ...prev, [controlWorkId]: true }))
      return
    }
    setExpandedIds((prev) => ({ ...prev, [controlWorkId]: false }))
  }

  const unmountExpanded = useCallback((controlWorkId: string) => {
    setMountedIds((prev) => {
      const next = { ...prev }
      delete next[controlWorkId]
      return next
    })
  }, [])

  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])

  const [sectionOrder, setSectionOrder] = useState<ControlWorkSubject[]>(DEFAULT_ORDER)
  const [sections, setSections] = useState<Record<ControlWorkSubject, SectionConfig>>(() =>
    Object.fromEntries(
      DEFAULT_ORDER.map((s) => [s, defaultSectionConfig()]),
    ) as Record<ControlWorkSubject, SectionConfig>,
  )

  const [form, setForm] = useState({
    title: "",
    groupId: "",
    dueDate: defaultDueDate(),
    unlimited: true,
    timeLimitMinutes: "45",
  })

  const grammarTopics = useMemo(
    () => groupExercisesByTopic(grammarExercises).filter((t) => t.category === "grammar"),
    [grammarExercises],
  )

  const refresh = async () => {
    try {
      const [list, subs, decks] = await Promise.all([
        controlWorkApi.list(),
        controlWorkApi.submissions(),
        exercisesApi.vocab(),
      ])
      setItems(list)
      setSubmissions(subs)
      setVocabDecks(decks)
    } catch {
      toast({
        title: "Failed to load progress tests",
        description: "Make sure the backend is running.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const enabledSections = sectionOrder.filter(
    (s) => sections[s]?.enabled && !IELTS_SKILL_SECTIONS.has(s),
  )

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const patchSection = (subject: ControlWorkSubject, patch: Partial<SectionConfig>) => {
    setSections((prev) => ({
      ...prev,
      [subject]: { ...prev[subject], ...patch },
    }))
  }

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSectionOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as ControlWorkSubject)
      const newIndex = prev.indexOf(over.id as ControlWorkSubject)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const toggleTopic = (subject: ControlWorkSubject, slug: string) => {
    const cfg = sections[subject]
    const has = cfg.topicSlugs.includes(slug)
    patchSection(subject, {
      topicSlugs: has ? cfg.topicSlugs.filter((s) => s !== slug) : [...cfg.topicSlugs, slug],
      exerciseSlugs: has ? cfg.exerciseSlugs : cfg.exerciseSlugs,
    })
  }

  const toggleExercise = (subject: ControlWorkSubject, slug: string) => {
    const cfg = sections[subject]
    const has = cfg.exerciseSlugs.includes(slug)
    patchSection(subject, {
      exerciseSlugs: has
        ? cfg.exerciseSlugs.filter((s) => s !== slug)
        : [...cfg.exerciseSlugs, slug],
    })
  }

  const toggleDeck = (slug: string) => {
    const cfg = sections.vocabulary
    const has = cfg.deckSlugs.includes(slug)
    patchSection("vocabulary", {
      deckSlugs: has ? cfg.deckSlugs.filter((s) => s !== slug) : [...cfg.deckSlugs, slug],
    })
  }

  const applyMix = (subject: "grammar" | "vocabulary") => {
    const cfg = sections[subject]
    if (subject === "grammar") {
      if (cfg.topicSlugs.length === 0) {
        toast({ title: "Select at least one grammar topic", variant: "destructive" })
        return
      }
      const pool = grammarExercises.filter((e) => cfg.topicSlugs.includes(e.topic))
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const picked = shuffled.slice(0, Math.min(cfg.mixCount, shuffled.length))
      patchSection("grammar", {
        mode: "mix",
        exerciseSlugs: picked.map((e) => e.slug),
      })
      toast({ title: "Mix applied", description: `${picked.length} random exercises selected` })
    } else {
      const shuffled = [...vocabDecks].sort(() => Math.random() - 0.5)
      const picked = shuffled.slice(0, Math.min(cfg.mixCount, shuffled.length))
      patchSection("vocabulary", {
        mode: "mix",
        deckSlugs: picked.map((d) => d.slug),
      })
      toast({ title: "Mix applied", description: `${picked.length} random decks selected` })
    }
  }

  const submit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Enter a title", variant: "destructive" })
      return
    }
    if (!form.groupId) {
      toast({ title: "Pick a group", variant: "destructive" })
      return
    }
    if (enabledSections.length === 0) {
      toast({ title: "Enable at least one section", variant: "destructive" })
      return
    }

    const apiSections: Parameters<typeof controlWorkApi.create>[0]["sections"] = {}

    for (const subject of enabledSections) {
      const cfg = sections[subject]
      if (subject === "grammar") {
        if (cfg.mode === "mix") {
          if (cfg.topicSlugs.length === 0) {
            toast({ title: "Grammar: select topics for mix", variant: "destructive" })
            return
          }
          apiSections.grammar = {
            mode: "mix",
            topicSlugs: cfg.topicSlugs,
            mixCount: cfg.mixCount,
          }
        } else {
          if (cfg.exerciseSlugs.length === 0 && cfg.topicSlugs.length === 0) {
            toast({ title: "Grammar: select topics or exercises", variant: "destructive" })
            return
          }
          apiSections.grammar = {
            mode: "manual",
            topicSlugs: cfg.topicSlugs,
            exerciseSlugs: cfg.exerciseSlugs.length ? cfg.exerciseSlugs : undefined,
          }
        }
      }
      if (subject === "vocabulary") {
        if (cfg.mode === "mix") {
          apiSections.vocabulary = { mode: "mix", mixCount: cfg.mixCount }
        } else if (cfg.deckSlugs.length === 0) {
          toast({ title: "Vocabulary: select at least one deck", variant: "destructive" })
          return
        } else {
          apiSections.vocabulary = { mode: "manual", deckSlugs: cfg.deckSlugs }
        }
      }
      if (IELTS_SKILL_SECTIONS.has(subject)) continue
    }

    const parsedLimit = Number.parseInt(form.timeLimitMinutes, 10)
    if (!form.unlimited && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      toast({ title: "Enter a valid time limit", variant: "destructive" })
      return
    }

    setAssigning(true)
    try {
      await controlWorkApi.create({
        title: form.title.trim(),
        groupId: form.groupId,
        dueAt: new Date(form.dueDate).toISOString(),
        timeLimitMinutes: form.unlimited ? undefined : parsedLimit,
        createdBy: createdByName,
        sectionOrder: enabledSections,
        sections: apiSections,
      })
      toast({ title: "Progress test assigned" })
      setShowCreate(false)
      setForm({ title: "", groupId: "", dueDate: defaultDueDate(), unlimited: true, timeLimitMinutes: "45" })
      setSections(
        Object.fromEntries(DEFAULT_ORDER.map((s) => [s, defaultSectionConfig()])) as Record<
          ControlWorkSubject,
          SectionConfig
        >,
      )
      setSectionOrder(DEFAULT_ORDER)
      await refresh()
      onChanged?.()
    } catch (err) {
      toast({
        title: "Could not assign",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeletingId(pendingDelete.id)
    try {
      await controlWorkApi.remove(pendingDelete.id)
      setPendingDelete(null)
      await refresh()
      onChanged?.()
    } catch {
      toast({ title: "Delete failed", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <TableSkeleton rows={5} columns={7} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            Assign multi-section unit tests with a custom section order.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4 mr-2" />
          New progress test
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <Layers className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-2 font-medium text-slate-900">No progress tests yet</p>
          <p className="text-sm text-slate-500">Create a unit test for a group.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-3 font-semibold">Assigned by</th>
                <th className="py-3 px-3 font-semibold">Title</th>
                <th className="py-3 px-3 font-semibold">Group</th>
                <th className="py-3 px-3 font-semibold">Sections</th>
                <th className="py-3 px-3 font-semibold">Due</th>
                <th className="py-3 px-3 font-semibold">Progress</th>
                <th className="py-3 px-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((cw) => {
                const group = groups.find((g) => g.id === cw.groupId)
                const subs = submissions.filter((s) => s.controlWorkId === cw.id)
                const done = subs.filter((s) => s.status === "submitted" || s.status === "graded").length
                const isExpanded = !!expandedIds[cw.id]
                return (
                  <Fragment key={cw.id}>
                    <tr
                      className={cn(
                        "cursor-pointer border-b transition-colors",
                        isExpanded
                          ? "border-slate-200 bg-slate-50/80 hover:bg-slate-50"
                          : "border-slate-100 hover:bg-slate-50",
                      )}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(cw.id)}
                    >
                      <td className="py-3 px-3 text-slate-700">{cw.createdBy || "—"}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{cw.title}</td>
                      <td className="py-3 px-3 text-slate-600">{group?.name ?? "—"}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex flex-wrap gap-1">
                          {uniqueSectionSubjects(cw.steps).map((subject) => (
                            <SectionBadge key={`${cw.id}-${subject}`} subject={subject} />
                          ))}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {formatShortDateTime(cw.dueAt)}
                      </td>
                      <td className="py-3 px-3 text-xs tabular-nums text-slate-700">
                        {done}/{subs.length}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={deletingId === cw.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPendingDelete(cw)
                            }}
                            className="h-7 w-7 p-0 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 text-slate-400 transition-transform duration-300 ease-out",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </div>
                      </td>
                    </tr>
                    {mountedIds[cw.id] && (
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={7} className="p-0">
                          <ExpandableRowContent
                            open={isExpanded}
                            rowId={cw.id}
                            onClosed={unmountExpanded}
                          >
                            <div className="px-4 py-4">
                              <ControlWorkStudentResults
                                cw={cw}
                                students={students}
                                submissions={subs}
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
      )}

      <Dialog
        open={showCreate}
        onOpenChange={setShowCreate}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New progress test</DialogTitle>
            <DialogDescription>
              Build a unit test: enable sections, set their order, pick topics manually or use Mix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Unit 3 — Mid-term check"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Group</Label>
                <Select value={form.groupId} onValueChange={(v) => setForm((p) => ({ ...p, groupId: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.unlimited}
                    onCheckedChange={(c) => setForm((p) => ({ ...p, unlimited: c === true }))}
                  />
                  Unlimited time
                </label>
                {!form.unlimited && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={form.timeLimitMinutes}
                      onChange={(e) => setForm((p) => ({ ...p, timeLimitMinutes: e.target.value }))}
                      className="w-24"
                    />
                    <span className="text-sm text-slate-500">min total</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">
                Section order
              </Label>
              <p className="mt-1 text-xs text-slate-500">
                Drag sections to reorder. Students complete enabled sections top to bottom.
              </p>
              <DndContext
                sensors={sectionSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  <div className="mt-2 space-y-2">
                    {sectionOrder.map((subject) => {
                      const meta = SECTION_META[subject]
                      const cfg = sections[subject]
                      const topicExercises =
                        subject === "grammar"
                          ? grammarExercises.filter(
                              (e) =>
                                cfg.topicSlugs.length === 0 || cfg.topicSlugs.includes(e.topic),
                            )
                          : []

                      return (
                        <SortableSectionCard
                          key={subject}
                          subject={subject}
                          comingSoon={IELTS_SKILL_SECTIONS.has(subject)}
                          enabled={
                            IELTS_SKILL_SECTIONS.has(subject) ? false : cfg.enabled
                          }
                          onEnabledChange={(checked) =>
                            patchSection(subject, { enabled: checked })
                          }
                        >
                          {cfg.enabled && subject === "grammar" && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={cfg.mode === "manual" ? "default" : "outline"}
                              onClick={() => patchSection("grammar", { mode: "manual" })}
                            >
                              Manual
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={cfg.mode === "mix" ? "default" : "outline"}
                              onClick={() => patchSection("grammar", { mode: "mix" })}
                            >
                              <Shuffle className="h-3.5 w-3.5 mr-1" />
                              Mix
                            </Button>
                            {cfg.mode === "mix" && (
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={cfg.mixCount}
                                onChange={(e) =>
                                  patchSection("grammar", {
                                    mixCount: Number.parseInt(e.target.value, 10) || 1,
                                  })
                                }
                                className="h-8 w-16"
                              />
                            )}
                            {cfg.mode === "mix" && (
                              <Button type="button" size="sm" variant="secondary" onClick={() => applyMix("grammar")}>
                                Apply mix
                              </Button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">Topics</p>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {grammarTopics.map((t) => (
                              <button
                                key={t.topic}
                                type="button"
                                onClick={() => toggleTopic("grammar", t.topic)}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                  cfg.topicSlugs.includes(t.topic)
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                                )}
                              >
                                {t.title}
                              </button>
                            ))}
                          </div>
                          {cfg.mode === "manual" && cfg.topicSlugs.length > 0 && (
                            <>
                              <p className="text-[11px] text-slate-500">Exercises</p>
                              <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
                                {topicExercises.map((ex) => (
                                  <label
                                    key={ex.slug}
                                    className="flex cursor-pointer items-center gap-2 text-xs"
                                  >
                                    <Checkbox
                                      checked={cfg.exerciseSlugs.includes(ex.slug)}
                                      onCheckedChange={() => toggleExercise("grammar", ex.slug)}
                                    />
                                    <span className="truncate">{ex.title}</span>
                                  </label>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {cfg.enabled && subject === "vocabulary" && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={cfg.mode === "manual" ? "default" : "outline"}
                              onClick={() => patchSection("vocabulary", { mode: "manual" })}
                            >
                              Manual
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={cfg.mode === "mix" ? "default" : "outline"}
                              onClick={() => patchSection("vocabulary", { mode: "mix" })}
                            >
                              <Shuffle className="h-3.5 w-3.5 mr-1" />
                              Mix
                            </Button>
                            {cfg.mode === "mix" && (
                              <>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={cfg.mixCount}
                                  onChange={(e) =>
                                    patchSection("vocabulary", {
                                      mixCount: Number.parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                  className="h-8 w-16"
                                />
                                <Button type="button" size="sm" variant="secondary" onClick={() => applyMix("vocabulary")}>
                                  Apply mix
                                </Button>
                              </>
                            )}
                          </div>
                          {cfg.mode === "manual" && (
                            <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
                              {vocabDecks.map((deck) => (
                                <label
                                  key={deck.slug}
                                  className="flex cursor-pointer items-center gap-2 text-xs"
                                >
                                  <Checkbox
                                    checked={cfg.deckSlugs.includes(deck.slug)}
                                    onCheckedChange={() => toggleDeck(deck.slug)}
                                  />
                                  <span className="truncate">
                                    {deck.title}{" "}
                                    <span className="text-slate-400">({deck.level})</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                        </SortableSectionCard>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {enabledSections.length > 0 && (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Preview order: </span>
                {enabledSections.map((s) => SECTION_META[s].label).join(" → ")}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={assigning}>
              Assign to group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this progress test?"
        description={
          pendingDelete && (
            <>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">{pendingDelete.title}</span>.
            </>
          )
        }
        onConfirm={confirmDelete}
        loading={!!pendingDelete && deletingId === pendingDelete.id}
      />
    </div>
  )
}

const EXPAND_ANIMATION_MS = 300

/** Smoothly animates content open and closed (0 ↔ full height). */
function ExpandableRowContent({
  open,
  rowId,
  onClosed,
  children,
}: {
  open: boolean
  rowId: string
  onClosed?: (rowId: string) => void
  children: ReactNode
}) {
  const [animateOpen, setAnimateOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setAnimateOpen(false)
      const id = requestAnimationFrame(() => setAnimateOpen(true))
      return () => cancelAnimationFrame(id)
    }
    setAnimateOpen(false)
  }, [open])

  useEffect(() => {
    if (open) return
    const timer = window.setTimeout(() => onClosed?.(rowId), EXPAND_ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [open, rowId, onClosed])

  const expanded = open && animateOpen

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
