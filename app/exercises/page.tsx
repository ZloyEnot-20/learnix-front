"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Folder,
  Lock,
  Mic,
  PenLine,
  SpellCheck,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { studentsApi } from "@/lib/api"
import {
  isCefrUnlocked,
  requiredLevelFor,
  type StudentLevel,
} from "@/lib/gamification"
import { LevelScale } from "@/components/student/level-scale"
import {
  formatDuration,
  buildTopicSummaries,
  type TopicSummary,
} from "@/lib/grammar-utils"
import { getExercises, getTopicsMeta } from "@/lib/exercises-cache"
import {
  listVocabDecks,
  fetchVocabDecks,
  onVocabDecksInvalidate,
  type VocabDeck,
} from "@/lib/vocabulary-data"
import { LevelFolderCardsSkeleton } from "@/components/admin/skeletons"
import { cn } from "@/lib/utils"

const LEVEL_PALETTE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700",
  A2: "bg-lime-100 text-lime-800",
  B1: "bg-sky-100 text-sky-700",
  B2: "bg-amber-100 text-amber-800",
  C1: "bg-rose-100 text-rose-700",
  C2: "bg-purple-100 text-purple-700",
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

interface SubjectFolder {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  cls: string
}

/** Subject folders shown inside every level. Grammar/Vocabulary carry the catalogue content. */
const SUBJECT_FOLDERS: SubjectFolder[] = [
  { id: "grammar", label: "Grammar", icon: SpellCheck, cls: "bg-amber-100 text-amber-800" },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked, cls: "bg-violet-100 text-violet-700" },
  { id: "reading", label: "Reading", icon: BookOpen, cls: "bg-sky-100 text-sky-700" },
  { id: "speaking", label: "Speaking", icon: Mic, cls: "bg-rose-100 text-rose-700" },
  { id: "writing", label: "Writing", icon: PenLine, cls: "bg-emerald-100 text-emerald-700" },
]

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
 * The folder a topic lives in. A wide-ranging topic (e.g. Past Simple spans
 * A1–B2) should sit in its *dominant* level, not get dragged into the lowest
 * one by a single introductory exercise. We tally each exercise's entry level
 * and pick the most common (ties resolve to the lower CEFR level). Placeholder
 * topics without exercises fall back to their declared range.
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
  return { display, cls: LEVEL_PALETTE[min] ?? "bg-slate-100 text-slate-700" }
}

export default function ExercisesIndexPage() {
  const { user } = useAuth()
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)

  const refresh = async () => {
    const [exercises, metas] = await Promise.all([getExercises(), getTopicsMeta()])
    setTopics(buildTopicSummaries(exercises, metas))
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false))
  }, [])

  // Students get folder gating by level; staff see everything unlocked.
  const isStudent = user?.type === "student"
  useEffect(() => {
    if (!isStudent || !user) {
      setStudentLevel(null)
      return
    }
    let cancelled = false
    studentsApi
      .level(user.id)
      .then((res) => !cancelled && setStudentLevel(res))
      .catch(() => !cancelled && setStudentLevel(null))
    return () => {
      cancelled = true
    }
  }, [isStudent, user])

  const currentLevel = studentLevel?.level ?? Number.MAX_SAFE_INTEGER
  const levelUnlocked = (cefr: string) =>
    !isStudent || isCefrUnlocked(cefr, currentLevel)

  const grammarTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          t.category === "grammar" ||
          t.category === "vocabulary" ||
          t.category === "speaking",
      ),
    [topics],
  )

  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>(() => listVocabDecks())
  useEffect(() => {
    const reload = () => void fetchVocabDecks().then(setVocabDecks)
    reload()
    return onVocabDecksInvalidate(reload)
  }, [])

  // Exactly the six fixed levels with their content folded in.
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
      }
    })
  }, [grammarTopics, vocabDecks])

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const activeLevelFolder = useMemo(
    () => levelFolders.find((f) => f.level === selectedLevel) ?? null,
    [levelFolders, selectedLevel],
  )
  const vocabDecksForLevel = useMemo(
    () =>
      selectedLevel
        ? vocabDecks.filter((d) => clampToFixedLevel(primaryLevel([d.level])) === selectedLevel)
        : [],
    [selectedLevel, vocabDecks],
  )
  const levelTopics = useMemo(
    () => activeLevelFolder?.topics ?? [],
    [activeLevelFolder],
  )
  const hasContent = true

  const categoryStats = (
    level: string,
    categoryId: string,
  ): { count: number; lines: string[] } => {
    if (categoryId === "vocabulary") {
      const decks = vocabDecks.filter((d) => clampToFixedLevel(primaryLevel([d.level])) === level)
      const words = decks.reduce((acc, d) => acc + d.words.length, 0)
      return {
        count: decks.length,
        lines: [
          `${decks.length} deck${decks.length === 1 ? "" : "s"}`,
          `${words} word${words === 1 ? "" : "s"}`,
        ],
      }
    }
    const bucket = levelFolders.find((f) => f.level === level)
    const topics = bucket?.topics.filter((t) => t.category === categoryId) ?? []
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
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Exercises</h1>
              <p className="mt-1 text-sm text-slate-500">
                Practice exercises grouped by topic. Pick a topic to see all available exercises.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {isStudent && user && !selectedLevel && (
          <LevelScale studentId={user.id} />
        )}

        {loading && (
          <section>
            <div className="h-5 w-40 rounded-md bg-slate-200 animate-pulse" />
            <div className="mt-2 h-4 w-80 rounded-md bg-slate-200 animate-pulse" />
            <div className="mt-4">
              <LevelFolderCardsSkeleton count={6} />
            </div>
          </section>
        )}

        {!loading && hasContent && !selectedLevel && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Choose a level</h2>
            <p className="mt-1 text-sm text-slate-500">
              Topics are organised into folders by CEFR level. Open a folder to see its topics.
            </p>
            <div
              className="mt-4 grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {levelFolders.map((folder) => {
                const locked = !levelUnlocked(folder.level)
                return (
                  <LevelFolderCard
                    key={folder.level}
                    level={folder.level}
                    label={folder.label}
                    topicCount={folder.topics.length}
                    exerciseCount={folder.exerciseCount}
                    questionCount={folder.questionCount}
                    wordCount={folder.wordCount}
                    locked={locked}
                    requiredLevel={requiredLevelFor(folder.level)}
                    onOpen={() => setSelectedLevel(folder.level)}
                  />
                )
              })}
            </div>
          </section>
        )}

        {!loading && hasContent && selectedLevel && !selectedCategory && (
          <section>
            <Breadcrumbs
              items={[
                { label: "Exercises", onClick: () => setSelectedLevel(null) },
                { label: selectedLevel },
              ]}
            />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {selectedLevel}{" "}
              <span className="text-base font-medium text-slate-500">
                · {LEVEL_LABELS[selectedLevel] ?? ""}
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">Choose a section</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="mt-4 gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div
              className="mt-4 grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {SUBJECT_FOLDERS.map((folder) => {
                const stats = categoryStats(selectedLevel, folder.id)
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

          </section>
        )}

        {!loading && hasContent && selectedLevel && selectedCategory && (
          <section>
            {(() => {
              const subject = SUBJECT_FOLDERS.find((f) => f.id === selectedCategory)
              const isVocab = selectedCategory === "vocabulary"
              const topics = levelTopics.filter((t) => t.category === selectedCategory)
              const count = isVocab ? vocabDecksForLevel.length : topics.length
              const levelLabel = selectedLevel
              return (
                <>
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
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">
                    {subject?.label ?? selectedCategory}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {levelLabel} · {count} {isVocab ? "deck" : "topic"}
                    {count === 1 ? "" : "s"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="mt-4 gap-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  {count === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                      <p className="font-medium text-slate-900">Coming soon</p>
                      <p className="text-sm text-slate-500">
                        {subject?.label ?? "These"} exercises haven&apos;t been added yet.
                      </p>
                    </div>
                  ) : isVocab ? (
                    <div
                      className="mt-4 grid gap-4 justify-center"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
                    >
                      {vocabDecksForLevel.map((d) => (
                        <VocabDeckCard key={d.slug} deck={d} />
                      ))}
                    </div>
                  ) : (
                    <div
                      className="mt-4 grid gap-4 justify-center"
                      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
                    >
                      {topics.map((t) => (
                        <TopicCard key={t.topic} topic={t} />
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </section>
        )}

        {!loading && !hasContent && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <p className="font-medium text-slate-900">No exercises yet</p>
            <p className="text-sm text-slate-500">
              Add exercises to grammar storage to see topic cards here.
            </p>
          </div>
        )}
      </div>
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
  locked = false,
  requiredLevel,
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
  locked?: boolean
  requiredLevel?: number
  onOpen: () => void
}) {
  const cls = colorCls ?? LEVEL_PALETTE[level] ?? "bg-slate-100 text-slate-700"
  const disabled = comingSoon || locked
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onOpen}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden
          className={cn(
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-sm",
            cls,
          )}
        >
          {locked ? <Lock className="h-6 w-6" /> : <Folder className="h-6 w-6" />}
        </span>
        <div className="flex items-center gap-1.5">
          {locked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lock className="h-3 w-3" />
              Lvl {requiredLevel}
            </span>
          )}
          {comingSoon && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Soon
            </span>
          )}
          {(badge || (!comingSoon && !locked)) && (
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>
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
            : locked
              ? `Reach level ${requiredLevel} to unlock`
              : `${topicCount} topic${topicCount === 1 ? "" : "s"} · ${exerciseCount} exercise${
                  exerciseCount === 1 ? "" : "s"
                } · ${questionCount} question${questionCount === 1 ? "" : "s"}`}
        </p>
        {!disabled && wordCount > 0 && (
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
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl shadow-sm",
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

function VocabDeckCard({ deck }: { deck: VocabDeck }) {
  return (
    <Link href={`/vocabulary/${deck.slug}`} className="group block h-full">
      <Card className="relative h-full rounded-3xl border-violet-200/80 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <CardContent className="p-6">
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
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    {deck.words.length} words
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    Flashcards · Quiz
                  </span>
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              {deck.level}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{deck.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function TopicCard({ topic }: { topic: TopicSummary }) {
  const lvl = summariseLevels(topic.levels)
  const empty = topic.exerciseCount === 0
  const disabled = empty || topic.comingSoon
  const isSpeaking = topic.category === "speaking"

  const card = (
      <Card
        className={cn(
          "relative h-full rounded-3xl border-slate-200/80 bg-white transition-all duration-200",
          isSpeaking && "border-rose-200/80",
          disabled
            ? "opacity-60"
            : "group-hover:-translate-y-1 group-hover:shadow-lg",
        )}
      >
        {(topic.comingSoon || empty) && (
          <span className="absolute -top-2 left-6 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            {topic.comingSoon ? "Coming soon" : "Empty"}
          </span>
        )}
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span
                aria-hidden
                className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1",
                  isSpeaking
                    ? "bg-gradient-to-br from-rose-200 to-rose-400 ring-rose-300/50"
                    : "bg-gradient-to-br from-amber-200 to-amber-400 ring-amber-300/50",
                )}
              >
                {isSpeaking ? (
                  <Mic className="h-5 w-5 text-rose-900" />
                ) : (
                  <Folder className="h-5 w-5 text-amber-900 fill-amber-100" />
                )}
              </span>
              <div className="min-w-0 space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">{topic.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <Badge>
                    {topic.exerciseCount} exercise
                    {topic.exerciseCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge>
                    {topic.questionCount} question
                    {topic.questionCount === 1 ? "" : "s"}
                  </Badge>
                  <Badge>{formatDuration(topic.totalMinutes)}</Badge>
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
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {topic.description ??
              `${topic.exerciseCount} exercise${
                topic.exerciseCount === 1 ? "" : "s"
              } and ${topic.questionCount} question${
                topic.questionCount === 1 ? "" : "s"
              } focused on ${topic.title}${
                topic.levels.length > 0
                  ? `, for ${topic.levels.join(", ")} learners.`
                  : "."
              }`}
          </p>
        </CardContent>
      </Card>
  )

  if (disabled) {
    return (
      <div aria-disabled className="block h-full cursor-not-allowed">
        {card}
      </div>
    )
  }
  return (
    <Link href={`/exercises/${topic.topic}`} className="group block h-full">
      {card}
    </Link>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  )
}
