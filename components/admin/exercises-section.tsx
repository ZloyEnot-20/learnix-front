"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
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
  BookMarked,
  BookOpen,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Folder,
  Infinity,
  ListChecks,
  Mic,
  PenLine,
  Search,
  SpellCheck,
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
import { getExercises, getTopicsMeta } from "@/lib/exercises-cache"
import {
  formatDuration,
  groupExercisesByTopic,
  buildTopicSummaries,
  topicTitle,
  type TopicMeta,
  type TopicSummary,
} from "@/lib/grammar-utils"
import { folderColorClass } from "@/lib/folder-colors"
import type { GrammarExercise } from "@/lib/grammar-types"
import {
  listVocabDecks,
  fetchVocabDecks,
  onVocabDecksInvalidate,
  vocabHomeworkSlug,
  type VocabDeck,
} from "@/lib/vocabulary-data"
import type { Group } from "@/lib/admin-storage"
import { groupMemberCount } from "@/lib/admin-storage"
import { homeworkApi } from "@/lib/api"
import { useAdminData } from "@/lib/admin-data-context"
import { selectableGroups } from "@/lib/entry-test-group"
import { useToast } from "@/hooks/use-toast"
import { LevelFolderCardsSkeleton } from "./skeletons"
import { Skeleton } from "@/components/ui/skeleton"
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

interface SubjectFolder {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  cls: string
}

/** Subject folders shown inside every level. Grammar/Vocabulary carry the catalogue content. */
const SUBJECT_FOLDERS: SubjectFolder[] = [
  { id: "grammar", label: "Grammar", icon: SpellCheck, cls: "bg-amber-100 text-amber-800 ring-amber-200/70" },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked, cls: "bg-violet-100 text-violet-700 ring-violet-200/70" },
  { id: "reading", label: "Reading", icon: BookOpen, cls: "bg-sky-100 text-sky-700 ring-sky-200/70" },
  { id: "speaking", label: "Speaking", icon: Mic, cls: "bg-sky-100 text-sky-700 ring-sky-200/70" },
  { id: "writing", label: "Writing", icon: PenLine, cls: "bg-emerald-100 text-emerald-700 ring-emerald-200/70" },
]

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

/** The six fixed levels. These are the only level folders that ever render. */
const LEVELS: { key: string; label: string }[] = [
  { key: "A1", label: "Beginner" },
  { key: "A2", label: "Elementary" },
  { key: "B1", label: "Intermediate" },
  { key: "B2", label: "Upper-Intermediate" },
  { key: "C1", label: "Advanced" },
  { key: "C2", label: "Expert" },
]

const LEVEL_LABELS: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Expert",
  Other: "Other",
}

/** The entry (lowest) CEFR level a topic belongs to — used to bucket it into a folder. */
function primaryLevel(levels: string[]): string {
  let best = Number.MAX_SAFE_INTEGER
  for (const l of levels) {
    for (const part of l.split(/[-–]/)) {
      const idx = CEFR_ORDER.indexOf(part.trim().toUpperCase())
      if (idx >= 0 && idx < best) best = idx
    }
  }
  return best === Number.MAX_SAFE_INTEGER ? "Other" : CEFR_ORDER[best]
}

/** Map any level (incl. "Other") onto one of the six fixed bands (A1–C2). */
function clampToFixedLevel(level: string): string {
  return CEFR_ORDER.includes(level) ? level : "A1"
}

/**
 * The folder a topic lives in: its *dominant* level (most common entry level
 * across its exercises) rather than the absolute minimum, so a wide-ranging
 * topic isn't dragged into the lowest folder by one introductory exercise.
 * Placeholder topics without exercises fall back to their declared range.
 */
function topicFolderLevel(topic: TopicSummary): string {
  if (!topic.exercises.length) return primaryLevel(topic.levels)
  const counts = new Map<string, number>()
  for (const ex of topic.exercises) {
    const lvl = primaryLevel([ex.level])
    counts.set(lvl, (counts.get(lvl) ?? 0) + 1)
  }
  const order = [...CEFR_ORDER, "Other"]
  let bestLevel = "Other"
  let bestCount = -1
  for (const [lvl, count] of counts) {
    if (count > bestCount || (count === bestCount && order.indexOf(lvl) < order.indexOf(bestLevel))) {
      bestLevel = lvl
      bestCount = count
    }
  }
  return bestLevel
}

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
  const { groups } = useAdminData()
  const assignableGroups = useMemo(() => selectableGroups(groups), [groups])

  const [exercises, setExercises] = useState<GrammarExercise[]>([])
  const [topicsMeta, setTopicsMeta] = useState<TopicMeta[]>([])
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [levelSearch, setLevelSearch] = useState("")
  const [topicTab, setTopicTab] = useState<"exercises" | "materials" | "explanation">("exercises")
  const [topicTypeFilter, setTopicTypeFilter] = useState<ExerciseTypeValue>("all")
  const [assignTarget, setAssignTarget] = useState<GrammarExercise | null>(null)
  const [assignDeck, setAssignDeck] = useState<VocabDeck | null>(null)
  const [previewDeck, setPreviewDeck] = useState<VocabDeck | null>(null)
  const [previewTarget, setPreviewTarget] = useState<GrammarExercise | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCatalog = async () => {
    const [ex, metas] = await Promise.all([getExercises(), getTopicsMeta()])
    setExercises(ex)
    setTopicsMeta(metas)
  }

  useEffect(() => {
    void loadCatalog().finally(() => setLoading(false))
  }, [])

  const grammarTopics = useMemo<TopicSummary[]>(() => {
    return buildTopicSummaries(exercises, topicsMeta).filter(
      (t) =>
        t.category === "grammar" ||
        t.category === "vocabulary" ||
        t.category === "speaking",
    )
  }, [exercises, topicsMeta])

  const colorBySlug = useMemo(() => {
    const m = new Map<string, string>()
    for (const meta of topicsMeta) {
      if (meta.color) m.set(meta.slug, meta.color)
    }
    return m
  }, [topicsMeta])

  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>(() => listVocabDecks())
  useEffect(() => {
    const reload = () => void fetchVocabDecks().then(setVocabDecks)
    reload()
    return onVocabDecksInvalidate(reload)
  }, [])

  // Exactly the six fixed levels, with their content folded in. Topics/decks
  // whose CEFR band falls outside A1–C2 are bucketed into the nearest fixed band.
  const levelFolders = useMemo(() => {
    const topicsByLevel = new Map<string, TopicSummary[]>()
    for (const t of grammarTopics) {
      const lvl = clampToFixedLevel(topicFolderLevel(t))
      if (!topicsByLevel.has(lvl)) topicsByLevel.set(lvl, [])
      topicsByLevel.get(lvl)!.push(t)
    }
    return LEVELS.map(({ key, label }) => {
      const list = topicsByLevel.get(key) ?? []
      return {
        level: key,
        label,
        topics: list,
        exerciseCount: list.reduce((acc, t) => acc + t.exerciseCount, 0),
        questionCount: list.reduce((acc, t) => acc + t.questionCount, 0),
        wordCount: vocabDecks
          .filter((d) => clampToFixedLevel(primaryLevel([d.level])) === key)
          .reduce((acc, d) => acc + d.words.length, 0),
        // Only grammar topic colours tint the level folder — speaking uses rose
        // per-topic and must not override the fixed A1–C2 palette.
        color: list
          .filter((t) => t.category === "grammar")
          .map((t) => colorBySlug.get(t.topic))
          .find(Boolean),
      }
    })
  }, [grammarTopics, colorBySlug, vocabDecks])

  const vocabDecksForLevel = useMemo(
    () =>
      selectedLevel
        ? vocabDecks.filter((d) => clampToFixedLevel(primaryLevel([d.level])) === selectedLevel)
        : [],
    [selectedLevel, vocabDecks],
  )
  const activeLevelFolder = useMemo(
    () => levelFolders.find((f) => f.level === selectedLevel) ?? null,
    [levelFolders, selectedLevel],
  )

  const levelTopics = useMemo(
    () => activeLevelFolder?.topics ?? [],
    [activeLevelFolder],
  )

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

  // Defer the heavy filtering behind the keystrokes so typing stays smooth, and
  // memoise it so it only recomputes when the query or catalogue changes.
  const deferredSearch = useDeferredValue(levelSearch)
  const searchHits = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    // Only search once the query is meaningful (3+ chars) to avoid noise/lag.
    if (query.length < 3) return { query: "", topics: [] as TopicSummary[], exercises: [] as GrammarExercise[] }
    const topics = grammarTopics.filter((t) =>
      `${t.title} ${t.topic} ${t.description ?? ""} ${t.levels.join(" ")}`
        .toLowerCase()
        .includes(query),
    )
    const exerciseHits = exercises.filter((e) =>
      `${e.title} ${e.slug} ${e.subtopic} ${e.topic} ${e.level} ${e.description}`
        .toLowerCase()
        .includes(query),
    )
    return { query, topics, exercises: exerciseHits }
  }, [deferredSearch, grammarTopics, exercises])

  // ─── Level folders view (top level) ──────────────────────────────────────
  if (!selectedTopic && !selectedLevel) {
    const query = searchHits.query
    const topicResults = searchHits.topics
    const exerciseResults = searchHits.exercises
    const totalMatches = topicResults.length + exerciseResults.length
    return (
      <div className="space-y-6">
        {loading ? (
          <section className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-80" />
            </div>
            <Skeleton className="h-10 w-full sm:max-w-md rounded-md" />
            <LevelFolderCardsSkeleton count={6} />
          </section>
        ) : levelFolders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <p className="font-medium text-slate-900">No exercises yet</p>
            <p className="text-sm text-slate-500">
              Add exercises to grammar storage to see topic cards here.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {query ? "Search results" : "Choose a level"}
                </h2>
                <p className="text-sm text-slate-500">
                  {query
                    ? `${totalMatches} result${totalMatches === 1 ? "" : "s"} matching “${levelSearch.trim()}”`
                    : "Topics are organised into folders by CEFR level. Open a folder to see its topics."}
                </p>
              </div>
              <div className="w-full sm:max-w-md">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={levelSearch}
                    onChange={(e) => setLevelSearch(e.target.value)}
                    placeholder="Search folders & exercises…"
                    className="pl-9"
                  />
                </div>
                {!query && levelSearch.trim().length > 0 && (
                  <p className="mt-1.5 text-xs text-slate-400 duration-200 animate-in fade-in-0">
                    Type at least 3 characters to search.
                  </p>
                )}
              </div>
            </div>

            {query ? (
              totalMatches === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center duration-200 animate-in fade-in-0">
                  <p className="font-medium text-slate-900">Nothing found</p>
                  <p className="text-sm text-slate-500">
                    Try a different word, or clear the search to browse by level.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {topicResults.length > 0 && (
                    <div className="space-y-2.5 duration-300 animate-in fade-in-0 slide-in-from-bottom-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Folders · {topicResults.length}
                      </h3>
                      <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
                      >
                        {topicResults.map((t) => (
                          <TopicHubCard
                            key={t.topic}
                            topic={t}
                            onSelect={() => setSelectedTopic(t.topic)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {exerciseResults.length > 0 && (
                    <div className="space-y-2.5 duration-300 animate-in fade-in-0 slide-in-from-bottom-1">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Exercises · {exerciseResults.length}
                      </h3>
                      <div
                        className="grid gap-3"
                        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
                      >
                        {exerciseResults.map((ex) => (
                          <ExerciseSearchCard
                            key={ex.id}
                            exercise={ex}
                            onOpenTopic={() => setSelectedTopic(ex.topic)}
                            onPreview={() => setPreviewTarget(ex)}
                            onAssign={canAssign ? () => setAssignTarget(ex) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div
                className="grid gap-3 duration-300 animate-in fade-in-0"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
              >
                {levelFolders.map((folder) => (
                  <LevelFolderCard
                    key={folder.level}
                    level={folder.level}
                    label={folder.label}
                    topicCount={folder.topics.length}
                    exerciseCount={folder.exerciseCount}
                    questionCount={folder.questionCount}
                    wordCount={folder.wordCount}
                    colorCls={folderColorClass(folder.color)}
                    onOpen={() => setSelectedLevel(folder.level)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <AssignDialog
          exercise={assignTarget}
          groups={assignableGroups}
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

  // ─── Category folders view (inside a level) ──────────────────────────────
  if (!selectedTopic && selectedLevel && !selectedCategory) {
    const statsFor = (id: string): { count: number; lines: string[] } => {
      if (id === "vocabulary") {
        const words = vocabDecksForLevel.reduce((acc, d) => acc + d.words.length, 0)
        return {
          count: vocabDecksForLevel.length,
          lines: [
            `${vocabDecksForLevel.length} deck${vocabDecksForLevel.length === 1 ? "" : "s"}`,
            `${words} word${words === 1 ? "" : "s"}`,
          ],
        }
      }
      const topics = levelTopics.filter((t) => t.category === id)
      const exercises = topics.reduce((acc, t) => acc + t.exerciseCount, 0)
      const questions = topics.reduce((acc, t) => acc + t.questionCount, 0)
      return {
        count: topics.length,
        lines: [
          `${topics.length} topic${topics.length === 1 ? "" : "s"}`,
          `${exercises} exercise${exercises === 1 ? "" : "s"}`,
          `${questions} question${questions === 1 ? "" : "s"}`,
        ],
      }
    }
    return (
      <div className="space-y-5">
        <Breadcrumbs
          items={[
            { label: "Exercises", onClick: () => setSelectedLevel(null) },
            { label: selectedLevel },
          ]}
        />
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center rounded-xl px-3 py-1 text-xl font-bold ring-1",
                folderColorClass(activeLevelFolder?.color) ?? levelBadgeClass(selectedLevel),
              )}
            >
              {selectedLevel}
            </span>
            <span className="text-base font-medium text-slate-500">
              {activeLevelFolder?.label ?? LEVEL_LABELS[selectedLevel] ?? ""}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Choose a section</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedLevel(null)}
          className="gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {SUBJECT_FOLDERS.map((folder) => {
            const stats = statsFor(folder.id)
            return (
              <SubjectFolderCard
                key={folder.id}
                folder={folder}
                count={stats.count}
                lines={stats.lines}
                onOpen={() => setSelectedCategory(folder.id)}
              />
            )
          })}
        </div>

        <AssignVocabDialog
          deck={assignDeck}
          groups={assignableGroups}
          open={!!assignDeck}
          onOpenChange={(open) => !open && setAssignDeck(null)}
          onAssigned={() => {
            toast({ title: "Vocabulary repetition assigned" })
            setAssignDeck(null)
            onHomeworkAssigned?.()
          }}
          createdByName={createdByName}
        />
      </div>
    )
  }

  // ─── Topics-in-category view ──────────────────────────────────────────────
  if (!selectedTopic && selectedLevel && selectedCategory) {
    const subject = SUBJECT_FOLDERS.find((f) => f.id === selectedCategory)
    const isVocab = selectedCategory === "vocabulary"
    const topics = levelTopics.filter((t) => t.category === selectedCategory)
    const count = isVocab ? vocabDecksForLevel.length : topics.length
    const levelLabel = selectedLevel
    return (
      <div className="space-y-5">
        <Breadcrumbs
          items={[
            {
              label: "Exercises",
              onClick: () => {
                setSelectedLevel(null)
                setSelectedCategory(null)
              },
            },
            { label: levelLabel, onClick: () => setSelectedCategory(null) },
            { label: subject?.label ?? selectedCategory },
          ]}
        />
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{subject?.label ?? selectedCategory}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {levelLabel} · {count} {isVocab ? "deck" : "topic"}
            {count === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <p className="font-medium text-slate-900">Coming soon</p>
            <p className="text-sm text-slate-500">
              {subject?.label ?? "These"} exercises haven&apos;t been added yet.
            </p>
          </div>
        ) : isVocab ? (
          <div
            className="grid gap-3 justify-center"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
          >
            {vocabDecksForLevel.map((d) => (
              <VocabDeckCard
                key={d.slug}
                deck={d}
                canAssign={canAssign}
                onAssign={() => setAssignDeck(d)}
                onPreview={() => setPreviewDeck(d)}
              />
            ))}
          </div>
        ) : (
          <div
            className="grid gap-3 justify-center"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
          >
            {topics.map((t) => (
              <TopicHubCard key={t.topic} topic={t} onSelect={() => setSelectedTopic(t.topic)} />
            ))}
          </div>
        )}

        <VocabPreviewDialog
          deck={previewDeck}
          open={!!previewDeck}
          onOpenChange={(open) => !open && setPreviewDeck(null)}
        />

        <AssignVocabDialog
          deck={assignDeck}
          groups={assignableGroups}
          open={!!assignDeck}
          onOpenChange={(open) => !open && setAssignDeck(null)}
          onAssigned={() => {
            toast({ title: "Vocabulary repetition assigned" })
            setAssignDeck(null)
            onHomeworkAssigned?.()
          }}
          createdByName={createdByName}
        />
      </div>
    )
  }

  // ─── Topic detail view ──────────────────────────────────────────────────
  const title = topicTitle(selectedTopic)
  const totalCount = topicExercises.length
  const topicMaterials = getMaterialsForTopic(selectedTopic)
  const hasMaterials = topicMaterials.length > 0
  const topicLevel =
    selectedLevel ?? (selectedTopicMeta ? primaryLevel(selectedTopicMeta.levels) : null)
  const topicCategory = selectedCategory ?? selectedTopicMeta?.category ?? "grammar"
  const topicSubject = SUBJECT_FOLDERS.find((f) => f.id === topicCategory)

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          {
            label: "Exercises",
            onClick: () => {
              setSelectedTopic(null)
              setSelectedLevel(null)
              setSelectedCategory(null)
            },
          },
          ...(topicLevel
            ? [
                {
                  label: topicLevel,
                  onClick: () => {
                    setSelectedTopic(null)
                    setSelectedCategory(null)
                    setSelectedLevel(topicLevel)
                  },
                },
              ]
            : []),
          {
            label: topicSubject?.label ?? topicCategory,
            onClick: () => setSelectedTopic(null),
          },
          { label: title },
        ]}
      />
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setSelectedTopic(null)}
        className="gap-1.5 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Button>

      {/* <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1">
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
      </div> */}

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
        groups={assignableGroups}
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

function Breadcrumbs({
  items,
}: {
  items: { label: string; onClick?: () => void }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={idx} className="inline-flex items-center gap-1">
            {item.onClick && !isLast ? (
              <button
                type="button"
                onClick={item.onClick}
                className="font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {item.label}
              </button>
            ) : (
              <span className={cn(isLast ? "font-semibold text-slate-900" : "text-slate-500")}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </span>
        )
      })}
    </nav>
  )
}

function LevelFolderCard({
  level,
  label,
  badge,
  topicCount,
  exerciseCount,
  questionCount,
  wordCount = 0,
  colorCls,
  comingSoon = false,
  onOpen,
}: {
  level: string
  label?: string
  badge?: string
  topicCount: number
  exerciseCount: number
  questionCount: number
  wordCount?: number
  colorCls?: string
  comingSoon?: boolean
  onOpen: () => void
}) {
  const cls =
    colorCls ?? LEVEL_PALETTE[level] ?? "bg-slate-100 text-slate-700 ring-slate-200/70"
  return (
    <button
      type="button"
      onClick={comingSoon ? undefined : onOpen}
      disabled={comingSoon}
      aria-disabled={comingSoon}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200",
        comingSoon
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1",
            cls,
          )}
        >
          <Folder className="h-6 w-6" />
        </span>
        <div className="flex items-center gap-1.5">
          {comingSoon && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200/70">
              Soon
            </span>
          )}
          {(badge || !comingSoon) && (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1", cls)}>
              {badge ?? level}
            </span>
          )}
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          {label ?? LEVEL_LABELS[level] ?? level}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {comingSoon
            ? "Coming soon"
            : `${topicCount} topic${topicCount === 1 ? "" : "s"} · ${exerciseCount} exercise${
                exerciseCount === 1 ? "" : "s"
              } · ${questionCount} question${questionCount === 1 ? "" : "s"}`}
        </p>
        {!comingSoon && wordCount > 0 && (
          <p className="mt-0.5 text-xs text-slate-500">
            {wordCount} vocabulary word{wordCount === 1 ? "" : "s"}
          </p>
        )}
      </div>
    </button>
  )
}

function SubjectFolderCard({
  folder,
  count,
  lines,
  onOpen,
}: {
  folder: SubjectFolder
  count: number
  lines: string[]
  onOpen: () => void
}) {
  const Icon = folder.icon
  const empty = count === 0
  return (
    <button
      type="button"
      onClick={empty ? undefined : onOpen}
      disabled={empty}
      aria-disabled={empty}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200",
        empty
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1",
            folder.cls,
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        {empty && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Soon
          </span>
        )}
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{folder.label}</h3>
        {empty ? (
          <p className="mt-0.5 text-xs text-slate-500">Coming soon</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {lines.map((line) => (
              <span
                key={line}
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {line}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

function VocabDeckCard({
  deck,
  canAssign,
  onAssign,
  onPreview,
}: {
  deck: VocabDeck
  canAssign: boolean
  onAssign: () => void
  onPreview: () => void
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-violet-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            aria-hidden
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-sm"
          >
            <BookMarked className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">{deck.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{deck.words.length} words</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">Flashcards · Quiz</span>
            </div>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
          {deck.level}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{deck.description}</p>
      <div className="mt-4 flex gap-2">
        {canAssign && (
          <Button
            size="sm"
            onClick={onAssign}
            className="flex-1 gap-1.5 bg-blue-500 hover:bg-blue-600 text-white h-9"
          >
            <UserPlus className="h-4 w-4" />
            Assign repetition
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={onPreview}
          className={cn("gap-1.5 h-9", !canAssign && "ml-auto")}
        >
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        <Button asChild size="sm" variant="outline" className="gap-1.5 h-9">
          <a href={`/vocabulary/${deck.slug}`} target="_blank" rel="noreferrer">
            <BookOpen className="h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  )
}

/** Read-only modal listing every word in a vocabulary deck. */
function VocabPreviewDialog({
  deck,
  open,
  onOpenChange,
}: {
  deck: VocabDeck | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-violet-500" />
            {deck?.title ?? "Vocabulary deck"}
          </DialogTitle>
          <DialogDescription>
            {deck ? (
              <>
                <span className="font-medium text-slate-900">{deck.words.length} words</span>
                <span className="text-slate-500"> · {deck.level}</span>
              </>
            ) : (
              "Deck preview"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {deck?.words.map((word, i) => (
            <div
              key={word.id ?? `${word.term}-${i}`}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{word.term}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {word.partOfSpeech}
                </span>
              </div>
              {word.definition && (
                <p className="mt-1 text-sm text-slate-600">{word.definition}</p>
              )}
              {(word.translation || word.translationUz) && (
                <p className="mt-1 text-sm text-slate-500">
                  {[word.translation, word.translationUz].filter(Boolean).join(" · ")}
                </p>
              )}
              {word.example && (
                <p className="mt-1 text-sm italic text-slate-400">“{word.example}”</p>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button asChild variant="outline" className="gap-1.5">
            <a href={deck ? `/vocabulary/${deck.slug}` : "#"} target="_blank" rel="noreferrer">
              <BookOpen className="h-4 w-4" />
              Open deck
            </a>
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Compact exercise card shown directly in global search results. */
function ExerciseSearchCard({
  exercise: ex,
  onOpenTopic,
  onPreview,
  onAssign,
}: {
  exercise: GrammarExercise
  onOpenTopic: () => void
  onPreview: () => void
  onAssign?: () => void
}) {
  const diff = DIFFICULTY_META[ex.difficulty]
  return (
    <Card className="h-full overflow-hidden border-slate-200/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpenTopic}
            className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            {topicTitle(ex.topic)}
          </button>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", levelBadgeClass(ex.level))}>
            {ex.level}
          </span>
        </div>

        <h4 className="text-sm font-bold leading-snug text-slate-900">{ex.title}</h4>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
          <span className="rounded-md bg-slate-50 px-2 py-0.5">{prettifySubtopic(ex.subtopic)}</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5">
            <ListChecks className="h-3 w-3 text-slate-400" />
            <span className="tabular-nums">{ex.totalQuestions}</span>
          </span>
          <span className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ring-1", diff.cls)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", diff.dot)} />
            {diff.label}
          </span>
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          {onAssign && (
            <Button size="sm" onClick={onAssign} className="h-8 flex-1 gap-1.5 bg-blue-500 text-white hover:bg-blue-600">
              <UserPlus className="h-3.5 w-3.5" />
              Assign
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onPreview}
            className={cn("h-8 gap-1.5", !onAssign && "ml-auto")}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TopicHubCard({
  topic: t,
  onSelect,
}: {
  topic: TopicSummary
  onSelect: () => void
}) {
  const lvl = summariseLevels(t.levels)
  const empty = t.exerciseCount === 0
  const disabled = empty || t.comingSoon
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn("text-left group", disabled && "cursor-not-allowed")}
    >
      <div
        className={cn(
          "relative border text-card-foreground shadow-sm h-full rounded-3xl border-slate-200/80 bg-white transition-all duration-200",
          disabled ? "opacity-60" : "group-hover:-translate-y-1 group-hover:shadow-lg",
        )}
      >
        {(t.comingSoon || empty) && (
          <span className="absolute -top-2 left-6 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {t.comingSoon ? "Coming soon" : "Empty"}
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
                <h3 className="text-lg font-semibold text-slate-900">{t.title}</h3>
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
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                lvl.cls,
              )}
            >
              {lvl.display}
            </span>
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
  )
}

function AssignVocabDialog({
  deck,
  groups,
  open,
  onOpenChange,
  onAssigned,
  createdByName,
}: {
  deck: VocabDeck | null
  groups: Group[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssigned: () => void
  createdByName: string
}) {
  const { toast } = useToast()
  const { students } = useAdminData()
  const [groupId, setGroupId] = useState<string>("")
  const [dueDate, setDueDate] = useState<string>("")
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!open) return
    setGroupId("")
    setDueDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().slice(0, 10))
  }, [open])

  const submit = async () => {
    if (!deck) return
    if (!groupId) {
      toast({ title: "Pick a group", variant: "destructive" })
      return
    }
    if (!dueDate) {
      toast({ title: "Pick a due date", variant: "destructive" })
      return
    }
    setAssigning(true)
    try {
      await homeworkApi.create({
        title: `Vocabulary: ${deck.title}`,
        description: `Review and quiz the ${deck.words.length} words in the ${deck.title} deck.`,
        subject: "vocabulary",
        groupId,
        dueAt: new Date(dueDate).toISOString(),
        estimatedMinutes: Math.max(5, Math.round(deck.words.length / 3)),
        createdBy: createdByName,
        exerciseSlug: vocabHomeworkSlug(deck.slug),
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
            <UserPlus className="h-4 w-4 text-slate-500" />
            Assign vocabulary repetition
          </DialogTitle>
          <DialogDescription>
            {deck ? (
              <>
                <span className="font-medium text-slate-900">{deck.title}</span>
                <span className="text-slate-500"> · {deck.words.length} words</span>
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
                        · {groupMemberCount(students, g.id)} student{groupMemberCount(students, g.id) === 1 ? "" : "s"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assign-vocab-due">Due date *</Label>
            <Input
              id="assign-vocab-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex-row justify-end gap-2 sm:space-x-0">
          <Button
            onClick={submit}
            loading={assigning}
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
  const { students } = useAdminData()
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
        subject: exercise.category === "speaking" ? "speaking" : "grammar",
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
                        · {groupMemberCount(students, g.id)} student
                        {groupMemberCount(students, g.id) === 1 ? "" : "s"}
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
