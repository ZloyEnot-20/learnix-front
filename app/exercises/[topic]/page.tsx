"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
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
  ArrowRight,
  ChevronLeft,
  Clock,
  Eye,
  Infinity,
  FileText,
  ListChecks,
  Send,
  Users,
} from "lucide-react"
import ExercisePreviewDialog from "@/components/exercises/exercise-preview-dialog"
import MaterialsGrid from "@/components/exercises/materials-grid"
import ExerciseTypeFilter, {
  type ExerciseTypeValue,
} from "@/components/exercises/exercise-type-filter"
import { getMaterialsForTopic } from "@/lib/grammar-materials"
import { getExercises, getTopicsMeta } from "@/lib/exercises-cache"
import {
  groupExercisesByTopic,
  buildTopicSummaries,
  topicTitle,
  type TopicMeta,
  type TopicSummary,
} from "@/lib/grammar-utils"
import type { GrammarExercise } from "@/lib/grammar-types"
import type { Group } from "@/lib/admin-storage"
import { getGroups, peekGroups } from "@/lib/admin-cache"
import { homeworkApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { CardGridSkeleton } from "@/components/admin/skeletons"
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
  mixed: {
    label: "Mixed",
    cls: "bg-violet-50 text-violet-700 ring-violet-200/60",
    dot: "bg-violet-500",
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

export default function ExercisesTopicPage() {
  const params = useParams<{ topic: string }>()
  const topic = params?.topic
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const canAssign = user ? user.type !== "student" : false

  const [allExercises, setAllExercises] = useState<GrammarExercise[]>([])
  const [topicsMeta, setTopicsMeta] = useState<TopicMeta[]>([])
  const [groups, setGroups] = useState<Group[]>(() => peekGroups() ?? [])
  const [assignTarget, setAssignTarget] = useState<GrammarExercise | null>(null)
  const [previewTarget, setPreviewTarget] = useState<GrammarExercise | null>(null)
  const [view, setView] = useState<"list" | "materials">("list")
  const [typeFilter, setTypeFilter] = useState<ExerciseTypeValue>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getExercises(), getTopicsMeta()])
      .then(([ex, metas]) => {
        if (cancelled) return
        setAllExercises(ex)
        setTopicsMeta(metas)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Only staff can assign homework, so only they need the group list.
  useEffect(() => {
    if (!canAssign) return
    getGroups()
      .then(setGroups)
      .catch(() => {})
  }, [canAssign])

  const exercises = useMemo(
    () => allExercises.filter((e) => e.topic === topic),
    [allExercises, topic],
  )

  const summary = useMemo<TopicSummary | null>(() => {
    if (!topic) return null
    if (exercises.length > 0) {
      return groupExercisesByTopic(exercises)[0] ?? null
    }
    return (
      buildTopicSummaries(allExercises, topicsMeta).find((t) => t.topic === topic) ?? null
    )
  }, [exercises, allExercises, topicsMeta, topic])

  const visibleExercises = useMemo(
    () => (typeFilter === "all" ? exercises : exercises.filter((e) => e.type === typeFilter)),
    [exercises, typeFilter],
  )

  if (!topic) return null

  const title = summary?.title ?? topicTitle(topic)
  const totalCount = exercises.length
  const visibleCount = visibleExercises.length
  const isComingSoon = summary?.comingSoon ?? false
  const materials = getMaterialsForTopic(topic)
  const hasMaterials = materials.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
          >
            <Link href="/exercises">
              <ChevronLeft className="h-4 w-4" />
              All topics
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
          {summary && (
            <p className="mt-1 text-sm text-slate-500">
              {summary.exerciseCount} exercise{summary.exerciseCount === 1 ? "" : "s"} ·{" "}
              {summary.questionCount} question{summary.questionCount === 1 ? "" : "s"} ·{" "}
              {summary.levels.join(", ")}
            </p>
          )}

          {hasMaterials && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setView((v) => (v === "materials" ? "list" : "materials"))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                  view === "materials"
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <FileText className="h-4 w-4" />
                {view === "materials" ? "Back to exercises" : "Materials"}
                {view !== "materials" && (
                  <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold tabular-nums text-slate-700">
                    {materials.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {view === "materials" ? (
          <MaterialsGrid materials={materials} />
        ) : loading && exercises.length === 0 ? (
          <CardGridSkeleton count={4} columns={2} />
        ) : (
          <>
        {exercises.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              {typeFilter === "all"
                ? `All ${totalCount} ${title} ${totalCount === 1 ? "Exercise" : "Exercises"}`
                : `${visibleCount} ${title} ${visibleCount === 1 ? "Exercise" : "Exercises"}`}
            </h2>
            <ExerciseTypeFilter
              exercises={exercises}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
        )}

        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 ring-1 ring-amber-300/50">
              <span className="text-2xl" aria-hidden>
                📁
              </span>
            </div>
            <p className="mt-3 font-semibold text-slate-900">
              {isComingSoon ? "Coming soon" : "No exercises in this topic yet"}
            </p>
            <p className="mt-1 mx-auto max-w-md text-sm text-slate-500">
              {summary?.description ??
                "Exercises for this topic haven't been added yet. Try another topic from the previous page."}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              <Link href="/exercises">
                <ChevronLeft className="h-4 w-4" />
                Back to all topics
              </Link>
            </Button>
          </div>
        ) : visibleExercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <p className="font-semibold text-slate-900">No exercises of this type</p>
            <p className="mt-1 mx-auto max-w-md text-sm text-slate-500">
              There are no matching exercises in this topic. Try another type.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTypeFilter("all")}
              className="mt-4 gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              Show all types
            </Button>
          </div>
        ) : (
          <div
            className="grid gap-4 justify-center"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 400px))" }}
          >
            {visibleExercises.map((ex) => {
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
                      <h3 className="font-bold text-slate-900 text-lg leading-snug">
                        {ex.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
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

                    <div className="mt-auto flex flex-col gap-2 pt-1">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push(`/exercises/${topic}/${ex.slug}`)}
                          className="flex-1 gap-1.5 bg-blue-500 hover:bg-blue-600 text-white h-10"
                        >
                          Start Exercise
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        {canAssign && (
                          <Button
                            variant="outline"
                            onClick={() => setPreviewTarget(ex)}
                            className="gap-1.5 h-10"
                          >
                            <Eye className="h-4 w-4" />
                            Preview
                          </Button>
                        )}
                      </div>
                      {canAssign && (
                        <Button
                          variant="outline"
                          onClick={() => setAssignTarget(ex)}
                          className="w-full gap-1.5"
                        >
                          <Send className="h-4 w-4" />
                          Assign to group
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
          </>
        )}
      </div>

      <AssignDialog
        exercise={assignTarget}
        groups={groups}
        open={!!assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        onAssigned={() => {
          toast({ title: "Exercise assigned to group" })
          setAssignTarget(null)
        }}
        createdByName={user?.name ?? "Admin"}
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
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!open) return
    setGroupId("")
    setUnlimited(true)
    setTimeLimit(String(exercise?.estimatedTime ?? 20))
    setDueDate(
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10),
    )
  }, [open, exercise])

  const submit = async () => {
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
    setAssigning(true)
    try {
      await homeworkApi.create({
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
    } catch (err) {
      toast({
        title: "Could not assign",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-slate-500" />
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
                <SelectValue placeholder={groups.length === 0 ? "No groups yet" : "Pick a group"} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {g.name}
                      <span className="text-xs text-slate-500">
                        · {g.studentIds.length} student{g.studentIds.length === 1 ? "" : "s"}
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
            loading={assigning}
            disabled={groups.length === 0}
            className="bg-blue-500 hover:bg-blue-600 gap-1.5"
          >
            <Send className="h-4 w-4" />
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
