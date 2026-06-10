"use client"

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
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
  ControlWorkSubject,
  ControlWorkSubmission,
  Group,
} from "@/lib/admin-storage"
import { useAdminData } from "@/lib/admin-data-context"
import { selectableGroups } from "@/lib/entry-test-group"
import { TableSkeleton } from "./skeletons"
import { controlWorkApi, exercisesApi } from "@/lib/api"
import { getExercises } from "@/lib/exercises-cache"
import type { GrammarExercise } from "@/lib/grammar-types"
import { groupExercisesByTopic } from "@/lib/grammar-utils"
import type { VocabDeck } from "@/lib/vocabulary-data"
import { useToast } from "@/hooks/use-toast"
import { ConfirmDialog } from "@/components/confirm-dialog"
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

interface SectionConfig {
  enabled: boolean
  mode: "manual" | "mix"
  topicSlugs: string[]
  exerciseSlugs: string[]
  deckSlugs: string[]
  mixCount: number
  testId: string
}

interface AdminTest {
  testId: string
  title: string
  type: string
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

function readAdminTests(): AdminTest[] {
  if (typeof window === "undefined") return []
  try {
    const saved = JSON.parse(localStorage.getItem("adminTests") || "{}")
    return Object.values(saved) as AdminTest[]
  } catch {
    return []
  }
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

function SortableSectionCard({
  subject,
  enabled,
  onEnabledChange,
  children,
}: {
  subject: ControlWorkSubject
  enabled: boolean
  onEnabledChange: (checked: boolean) => void
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
        <Checkbox checked={enabled} onCheckedChange={(c) => onEnabledChange(c === true)} />
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{ backgroundColor: meta.color }}
        >
          <Icon className="h-3.5 w-3.5 text-slate-900/80" />
        </span>
        <span className="flex-1 font-semibold text-slate-900">{meta.label}</span>
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
  const { groups } = useAdminData()
  const assignableGroups = useMemo(() => selectableGroups(groups), [groups])
  const [items, setItems] = useState<ControlWork[]>([])
  const [submissions, setSubmissions] = useState<ControlWorkSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ControlWork | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const [grammarExercises, setGrammarExercises] = useState<GrammarExercise[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>([])
  const [adminTests, setAdminTests] = useState<AdminTest[]>([])

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
      const [list, subs, exercises, decks] = await Promise.all([
        controlWorkApi.list(),
        controlWorkApi.submissions(),
        getExercises(true),
        exercisesApi.vocab(),
      ])
      setItems(list)
      setSubmissions(subs)
      setGrammarExercises(exercises)
      setVocabDecks(decks)
      setAdminTests(readAdminTests())
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

  const enabledSections = sectionOrder.filter((s) => sections[s]?.enabled)

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

  const testsFor = (type: string) => adminTests.filter((t) => t.type === type)

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
      if (subject === "reading" || subject === "listening" || subject === "writing") {
        if (!cfg.testId) {
          toast({ title: `${SECTION_META[subject].label}: pick a test`, variant: "destructive" })
          return
        }
        const test = adminTests.find((t) => t.testId === cfg.testId)
        apiSections[subject] = {
          testId: cfg.testId,
          testTitle: test?.title ?? cfg.testId,
        }
      }
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

  if (loading) return <TableSkeleton rows={5} columns={5} />

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
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() =>
                        setExpandedIds((p) => ({ ...p, [cw.id]: !p[cw.id] }))
                      }
                    >
                      <td className="py-3 px-3 font-medium text-slate-900">{cw.title}</td>
                      <td className="py-3 px-3 text-slate-600">{group?.name ?? "—"}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex flex-wrap gap-1">
                          {cw.steps.map((step, i) => {
                            const meta = SECTION_META[step.subject]
                            const Icon = meta.icon
                            return (
                              <span
                                key={`${cw.id}-${i}`}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                              >
                                <Icon className="h-3 w-3" />
                                {meta.label}
                              </span>
                            )
                          })}
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
                              "h-4 w-4 text-slate-400 transition-transform",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td colSpan={6} className="px-4 py-3">
                          <ol className="space-y-1 text-xs text-slate-600">
                            {cw.steps.map((step, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="font-semibold text-slate-400">{i + 1}.</span>
                                <span className="font-medium text-slate-800">{step.title}</span>
                                <span className="text-slate-400">({SECTION_META[step.subject].label})</span>
                              </li>
                            ))}
                          </ol>
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
                          enabled={cfg.enabled}
                          onEnabledChange={(checked) => patchSection(subject, { enabled: checked })}
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
                                key={t.slug}
                                type="button"
                                onClick={() => toggleTopic("grammar", t.slug)}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                  cfg.topicSlugs.includes(t.slug)
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

                      {cfg.enabled &&
                        (subject === "reading" ||
                          subject === "listening" ||
                          subject === "writing") && (
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <Select
                              value={cfg.testId || undefined}
                              onValueChange={(v) => patchSection(subject, { testId: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${meta.label} test`} />
                              </SelectTrigger>
                              <SelectContent>
                                {testsFor(subject).map((t) => (
                                  <SelectItem key={t.testId} value={t.testId}>
                                    {t.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {testsFor(subject).length === 0 && (
                              <p className="mt-1 text-[11px] text-amber-700">
                                No {meta.label} tests in IELTS Tests — add one first.
                              </p>
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
