"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  BookOpenText,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  Folder,
  Infinity,
  ListChecks,
  UserPlus,
  Users,
} from "lucide-react"
import ExercisePreviewDialog from "@/components/exercises/exercise-preview-dialog"
import MaterialsGrid from "@/components/exercises/materials-grid"
import ExplanationPreview from "@/components/exercises/explanation-preview"
import ExerciseTypeFilter, {
  type ExerciseTypeValue,
} from "@/components/exercises/exercise-type-filter"
import { getMaterialsForTopic } from "@/lib/grammar-materials"
import {
  ensureGrammarSeed,
  listGrammarExercises,
} from "@/lib/grammar-storage"
import {
  formatDuration,
  groupExercisesByTopic,
  listAllTopicSummaries,
  topicTitle,
  type TopicSummary,
} from "@/lib/grammar-utils"
import type { GrammarExercise } from "@/lib/grammar-types"
import {
  createHomework,
  ensureSeeded,
  listGroups,
  type Group,
} from "@/lib/admin-storage"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const DIFFICULTY_META: Record<
  GrammarExercise["difficulty"],
  { label: string; cls: string; dot: string }
> = {
  easy: {
    label: "Easy",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    dot: "bg-emerald-500",
  },
  medium: {
    label: "Medium",
    cls: "bg-amber-50 text-amber-800 ring-amber-200/60",
    dot: "bg-amber-500",
  },
  hard: {
    label: "Hard",
    cls: "bg-rose-50 text-rose-700 ring-rose-200/60",
    dot: "bg-rose-500",
  },
}

const LEVEL_PALETTE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700 ring-emerald-200/70",
  A2: "bg-lime-100 text-lime-800 ring-lime-200/70",
  B1: "bg-sky-100 text-sky-700 ring-sky-200/70",
  B2: "bg-amber-100 text-amber-800 ring-amber-200/70",
  C1: "bg-rose-100 text-rose-700 ring-rose-200/70",
  C2: "bg-purple-100 text-purple-700 ring-purple-200/70",
}

function levelBadgeClass(level: string): string {
  const key = level.split(/[-–]/)[0].trim().toUpperCase()
  return LEVEL_PALETTE[key] ?? "bg-slate-100 text-slate-700 ring-slate-200/70"
}

function prettifySubtopic(subtopic: string): string {
  return subtopic
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

function summariseLevels(levels: string[]): { display: string; cls: string } {
  const all = new Set<string>()
  for (const l of levels) {
    l.split(/[-–]/).forEach((p) => {
      const trimmed = p.trim().toUpperCase()
      if (trimmed) all.add(trimmed)
    })
  }
  const sorted = [...all]
    .filter((x) => CEFR_ORDER.includes(x))
    .sort((a, b) => CEFR_ORDER.indexOf(a) - CEFR_ORDER.indexOf(b))
  if (sorted.length === 0) {
    return { display: levels[0] ?? "—", cls: "bg-slate-100 text-slate-700" }
  }
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const display = min === max ? min : `${min}–${max}`
  const palette: Record<string, string> = {
    A1: "bg-emerald-100 text-emerald-700",
    A2: "bg-lime-100 text-lime-800",
    B1: "bg-sky-100 text-sky-700",
    B2: "bg-amber-100 text-amber-800",
    C1: "bg-rose-100 text-rose-700",
    C2: "bg-purple-100 text-purple-700",
  }
  return { display, cls: palette[min] ?? "bg-slate-100 text-slate-700" }
}

interface ExercisesSectionProps {
  /** Used when assigning homework — author label. */
  createdByName: string
  /** If true, shows the "Assign to group" button for admin/teacher. */
  canAssign: boolean
  /** Optional: notify parent when homework is assigned (e.g. to refresh badges). */
  onHomeworkAssigned?: () => void
}

export default function ExercisesSection({
  createdByName,
  canAssign,
  onHomeworkAssigned,
}: ExercisesSectionProps) {
  const { toast } = useToast()

  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [topicTab, setTopicTab] = useState<"exercises" | "materials" | "explanation">("exercises")
  const [topicTypeFilter, setTopicTypeFilter] = useState<ExerciseTypeValue>("all")
  const [assignTarget, setAssignTarget] = useState<GrammarExercise | null>(null)
  const [previewTarget, setPreviewTarget] = useState<GrammarExercise | null>(null)

  useEffect(() => {
    ensureGrammarSeed()
    ensureSeeded()
    setExercises(listGrammarExercises())
    setGroups(listGroups())
  }, [])

  const grammarTopics = useMemo<TopicSummary[]>(() => {
    return listAllTopicSummaries(exercises).filter((t) => t.category === "grammar")
  }, [exercises])

  const selectedTopicMeta = useMemo<TopicSummary | null>(() => {
    if (!selectedTopic) return null
    return grammarTopics.find((t) => t.topic === selectedTopic) ?? null
  }, [selectedTopic, grammarTopics])

  const topicExercises = useMemo(() => {
    if (!selectedTopic) return []
    return exercises.filter((e) => e.topic === selectedTopic)
  }, [exercises, selectedTopic])

  const visibleTopicExercises = useMemo(
    () =>
      topicTypeFilter === "all"
        ? topicExercises
        : topicExercises.filter((e) => e.type === topicTypeFilter),
    [topicExercises, topicTypeFilter],
  )

  useEffect(() => {
    setTopicTab("exercises")
    setTopicTypeFilter("all")
  }, [selectedTopic])

  const topicSummary = useMemo(() => {
    if (!selectedTopic || topicExercises.length === 0) return null
    return groupExercisesByTopic(topicExercises)[0] ?? null
  }, [selectedTopic, topicExercises])

  // ─── Hub view ───────────────────────────────────────────────────────────
  if (!selectedTopic) {
    return (
      <div className="space-y-6">
        {grammarTopics.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <p className="font-medium text-slate-900">No exercises yet</p>
            <p className="text-sm text-slate-500">
              Add exercises to grammar storage to see topic cards here.
            </p>
          </div>
        ) : (
          <section>
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-slate-900">Choose a Grammar Topic</h2>
              <p className="text-sm text-slate-500">
                Each topic hub groups together related exercises, question counts, and level coverage.
              </p>
            </div>
            <div
              className="mt-3 grid gap-3 justify-center"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
            >
              {grammarTopics.map((t) => (
                <button
                  key={t.topic}
                  type="button"
                  onClick={() => setSelectedTopic(t.topic)}
                  className="text-left group"
                >
                  <div
                    className={cn(
                      "relative border text-card-foreground shadow-sm h-full rounded-3xl border-slate-200/80 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg",
                      t.comingSoon && "opacity-90",
                    )}
                  >
                    {t.comingSoon && (
                      <span className="absolute -top-2 left-6 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                        Coming soon
                      </span>
                    )}
                    <div className="flex flex-col space-y-1.5 p-6 border-b border-slate-100 pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span
                            aria-hidden
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-400 shadow-sm ring-1 ring-amber-300/50"
                          >
                            <Folder className="h-5 w-5 text-amber-900 fill-amber-100" />
                          </span>
                          <div className="min-w-0 space-y-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {t.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {t.exerciseCount} exercise{t.exerciseCount === 1 ? "" : "s"}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {t.questionCount} question{t.questionCount === 1 ? "" : "s"}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {formatDuration(t.totalMinutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {(() => {
                          const lvl = summariseLevels(t.levels)
                          return (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                lvl.cls,
                              )}
                            >
                              {lvl.display}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="p-6 pt-5">
                      <p className="text-sm leading-relaxed text-slate-600">
                        {t.description ??
                          `${t.exerciseCount} exercise${t.exerciseCount === 1 ? "" : "s"} and ${
                            t.questionCount
                          } question${t.questionCount === 1 ? "" : "s"} focused on ${t.title}${
                            t.levels.length > 0 ? `, for ${t.levels.join(", ")} learners.` : "."
                          }`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    )
  }

  // ─── Topic detail view ──────────────────────────────────────────────────
  const title = topicTitle(selectedTopic)
  const totalCount = topicExercises.length
  const topicMaterials = getMaterialsForTopic(selectedTopic)
  const hasMaterials = topicMaterials.length > 0

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setSelectedTopic(null)}
        className="gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        All topics
      </Button>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {topicSummary && (
          <p className="mt-1 text-sm text-slate-500">
            {topicSummary.exerciseCount} exercise{topicSummary.exerciseCount === 1 ? "" : "s"} ·{" "}
            {topicSummary.questionCount} question{topicSummary.questionCount === 1 ? "" : "s"} ·{" "}
            {topicSummary.levels.join(", ")}
          </p>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1">
        <button
          type="button"
          onClick={() => setTopicTab("exercises")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            topicTab === "exercises"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          <ListChecks className="h-4 w-4" />
          Exercises
          <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-700">
            {totalCount}
          </span>
        </button>
        {hasMaterials && (
          <button
            type="button"
            onClick={() => setTopicTab("materials")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              topicTab === "materials"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <FileText className="h-4 w-4" />
            Materials
            <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-700">
              {topicMaterials.length}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setTopicTab("explanation")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            topicTab === "explanation"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          <BookOpenText className="h-4 w-4" />
          Explanation
          <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
            Soon
          </span>
        </button>
      </div>

      {topicTab === "materials" ? (
        <MaterialsGrid materials={topicMaterials} />
      ) : topicTab === "explanation" ? (
        <ExplanationPreview />
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-slate-900">
              {topicTypeFilter === "all"
                ? `All ${totalCount} ${title} ${totalCount === 1 ? "Exercise" : "Exercises"}`
                : `${visibleTopicExercises.length} ${title} ${
                    visibleTopicExercises.length === 1 ? "Exercise" : "Exercises"
                  }`}
            </h3>
            {topicExercises.length > 0 && (
              <ExerciseTypeFilter
                exercises={topicExercises}
                value={topicTypeFilter}
                onChange={setTopicTypeFilter}
              />
            )}
          </div>

          {topicExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 ring-1 ring-amber-300/50">
            <Folder className="h-6 w-6 text-amber-900 fill-amber-100" />
          </div>
          <p className="mt-3 font-semibold text-slate-900">
            {selectedTopicMeta?.comingSoon ? "Coming soon" : "No exercises yet"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTopicMeta?.description ??
              "Exercises for this topic haven't been added yet."}
          </p>
        </div>
      ) : visibleTopicExercises.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
          <p className="font-semibold text-slate-900">No exercises of this type</p>
          <p className="mt-1 text-sm text-slate-500">
            There are no matching exercises in this topic. Try another type.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTopicTypeFilter("all")}
            className="mt-4 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            Show all types
          </Button>
        </div>
      ) : (
        <div
          className="grid gap-4 justify-center"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 400px))" }}
        >
          {visibleTopicExercises.map((ex) => {
            const diff = DIFFICULTY_META[ex.difficulty]
            const levelCls = levelBadgeClass(ex.level)
            return (
              <Card
                key={ex.id}
                className="group h-full overflow-hidden border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <CardContent className="p-5 flex flex-col h-full gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600">
                      {prettifySubtopic(ex.subtopic)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1",
                        levelCls,
                      )}
                    >
                      {ex.level}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-slate-900 text-base leading-snug">
                      {ex.title}
                    </h4>
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      {ex.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-slate-400" />
                      <span className="tabular-nums">{ex.totalQuestions}</span>
                      <span className="text-slate-500">questions</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="tabular-nums">{ex.estimatedTime}</span>
                      <span className="text-slate-500">min</span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                        diff.cls,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", diff.dot)} />
                      {diff.label}
                    </span>
                  </div>

                  <div className="mt-auto flex gap-2">
                    {canAssign && (
                      <Button
                        size="sm"
                        onClick={() => setAssignTarget(ex)}
                        className="flex-1 gap-1.5 bg-blue-500 hover:bg-blue-600 text-white h-9"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewTarget(ex)}
                      className={cn("gap-1.5 h-9", !canAssign && "ml-auto")}
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
          )}
        </>
      )}

      <AssignDialog
        exercise={assignTarget}
        groups={groups}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        onAssigned={() => {
          toast({ title: "Exercise assigned to group" })
          setAssignTarget(null)
          onHomeworkAssigned?.()
        }}
        createdByName={createdByName}
      />

      <ExercisePreviewDialog
        exercise={previewTarget}
        open={!!previewTarget}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
      />
    </div>
  )
}

function AssignDialog({
  exercise,
  groups,
  open,
  onOpenChange,
  onAssigned,
  createdByName,
}: {
  exercise: GrammarExercise | null
  groups: Group[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
  createdByName: string
}) {
  const { toast } = useToast()
  const [groupId, setGroupId] = useState<string>("")
  const [dueDate, setDueDate] = useState<string>("")
  const [unlimited, setUnlimited] = useState<boolean>(true)
  const [timeLimit, setTimeLimit] = useState<string>("20")

  useEffect(() => {
    if (!open) return
    setGroupId("")
    setUnlimited(true)
    setTimeLimit(String(exercise?.estimatedTime ?? 20))
    setDueDate(
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
    )
  }, [open, exercise])

  const submit = () => {
    if (!exercise) return
    if (!groupId) {
      toast({ title: "Pick a group", variant: "destructive" })
      return
    }
    if (!dueDate) {
      toast({ title: "Pick a due date", variant: "destructive" })
      return
    }
    const parsedLimit = Number.parseInt(timeLimit, 10)
    if (!unlimited && (!Number.isFinite(parsedLimit) || parsedLimit <= 0)) {
      toast({ title: "Enter a valid time limit", variant: "destructive" })
      return
    }
    createHomework({
      title: exercise.title,
      description: exercise.description,
      subject: "grammar",
      groupId,
      dueAt: new Date(dueDate).toISOString(),
      estimatedMinutes: Math.max(1, exercise.estimatedTime),
      createdBy: createdByName,
      exerciseSlug: exercise.slug,
      timeLimitMinutes: unlimited ? undefined : parsedLimit,
    })
    onAssigned()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-slate-500" />
            Assign exercise
          </DialogTitle>
          <DialogDescription>
            {exercise ? (
              <>
                <span className="font-medium text-slate-900">{exercise.title}</span>
                <span className="text-slate-500"> · {exercise.totalQuestions} questions</span>
              </>
            ) : (
              "Pick a group and a due date"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Group *</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={groups.length === 0 ? "No groups yet" : "Pick a group"}
                />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {g.name}
                      <span className="text-xs text-slate-500">
                        · {g.studentIds.length} student
                        {g.studentIds.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-due">Due date *</Label>
            <Input
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Time limit</Label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUnlimited((v) => !v)}
                aria-pressed={unlimited}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  unlimited
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <Infinity className="h-3.5 w-3.5" />
                Unlimited
              </button>
              {!unlimited && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="number"
                      min={1}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      className="h-9 w-24 pl-8"
                    />
                  </div>
                  <span className="text-xs text-slate-500">minutes</span>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {unlimited
                ? "Students can take as long as they need."
                : "A countdown timer will be shown on the exercise page."}
            </p>
          </div>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button
            onClick={submit}
            disabled={groups.length === 0}
            className="bg-blue-500 hover:bg-blue-600 gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Assign
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
