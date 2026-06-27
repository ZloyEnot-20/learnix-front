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
  Headphones,
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
import {
  listPodcasts,
  fetchPodcasts,
  onPodcastsInvalidate,
  podcastHasWords,
  type PodcastEpisode,
} from "@/lib/podcast-data"
import { LevelFolderCardsSkeleton, CardGridSkeleton } from "@/components/admin/skeletons"
import { cn } from "@/lib/utils"
import {
  fetchReadingSummaries,
  listReadings,
  type IeltsReadingSummary,
} from "@/lib/reading-data"
import { ReadingTypeFilters } from "@/components/exercises/reading-type-filters"
import {
  collectAvailableReadingTypes,
  filterReadingsByQuestionType,
  readingQuestionTypeLabel,
  sortReadingQuestionTypes,
} from "@/lib/reading-question-types"
import {
  IELTS_LEVEL,
  IELTS_LEVEL_KEY,
  IELTS_LEVEL_PALETTE,
  IELTS_SUBJECT_FOLDERS,
  ieltsCategoryStats,
  ieltsFolderStats,
  isIeltsLevel,
} from "@/lib/ielts-exercises"

const LEVEL_PALETTE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700",
  A2: "bg-lime-100 text-lime-800",
  B1: "bg-sky-100 text-sky-700",
  B2: "bg-amber-100 text-amber-800",
  C1: "bg-rose-100 text-rose-700",
  C2: "bg-purple-100 text-purple-700",
}

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

/** Visible CEFR level folders (C2/Expert is hidden — content folds into C1). */
const LEVELS: { key: string; label: string }[] = [
  { key: "A1", label: "Beginner" },
  { key: "A2", label: "Elementary" },
  { key: "B1", label: "Intermediate" },
  { key: "B2", label: "Upper-Intermediate" },
  { key: "C1", label: "Advanced" },
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

/** Subject folders inside CEFR level folders. IELTS skills live under the IELTS folder. */
const CEFR_SUBJECT_FOLDERS: SubjectFolder[] = [
  { id: "grammar", label: "Grammar", icon: SpellCheck, cls: "bg-amber-100 text-amber-800" },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked, cls: "bg-violet-100 text-violet-700" },
  { id: "podcasts", label: "Podcasts", icon: Headphones, cls: "bg-emerald-100 text-emerald-700" },
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

/** Map any level (incl. "Other") onto a visible band (A1–C1). C2 folds into C1. */
function clampToFixedLevel(level: string): string {
  if (level === "C2") return "C1"
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

  const [podcasts, setPodcasts] = useState<PodcastEpisode[]>(() => listPodcasts())
  useEffect(() => {
    const reload = () => void fetchPodcasts().then(setPodcasts)
    reload()
    return onPodcastsInvalidate(reload)
  }, [])

  const [readings, setReadings] = useState<IeltsReadingSummary[]>(() => listReadings())
  const [readingsLoading, setReadingsLoading] = useState(true)
  const [readingTypeFilter, setReadingTypeFilter] = useState<string | null>(null)
  useEffect(() => {
    void fetchReadingSummaries()
      .then(setReadings)
      .finally(() => setReadingsLoading(false))
  }, [])

  const ieltsStats = useMemo(() => ieltsFolderStats(readings), [readings])

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

  useEffect(() => {
    setReadingTypeFilter(null)
  }, [selectedCategory])

  const readingQuestionTypes = useMemo(
    () => collectAvailableReadingTypes(readings),
    [readings],
  )
  const filteredReadings = useMemo(
    () => filterReadingsByQuestionType(readings, readingTypeFilter),
    [readings, readingTypeFilter],
  )

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
  const podcastsForLevel = useMemo(
    () =>
      selectedLevel
        ? podcasts.filter((p) => clampToFixedLevel(primaryLevel([p.level])) === selectedLevel)
        : [],
    [selectedLevel, podcasts],
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
    if (isIeltsLevel(level)) {
      return ieltsCategoryStats(categoryId, readings)
    }
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
    if (categoryId === "podcasts") {
      const episodes = podcasts.filter((p) => clampToFixedLevel(primaryLevel([p.level])) === level)
      const withWords = episodes.filter((p) => podcastHasWords(p)).length
      return {
        count: episodes.length,
        lines: [
          `${episodes.length} episode${episodes.length === 1 ? "" : "s"}`,
          withWords > 0 ? `${withWords} with words` : "Listening",
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

  const subjectFolders = isIeltsLevel(selectedLevel) ? IELTS_SUBJECT_FOLDERS : CEFR_SUBJECT_FOLDERS

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
              Topics are organised into folders by CEFR level. Open IELTS for exam-style practice.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <LevelFolderCard
                level={IELTS_LEVEL_KEY}
                label={IELTS_LEVEL.label}
                badge="IELTS"
                colorCls={IELTS_LEVEL_PALETTE}
                topicCount={ieltsStats.sectionCount}
                exerciseCount={ieltsStats.passageCount}
                questionCount={ieltsStats.questionCount}
                onOpen={() => setSelectedLevel(IELTS_LEVEL_KEY)}
              />
            </div>
          </section>
        )}

        {!loading && hasContent && selectedLevel && !selectedCategory && (
          <section>
            <Breadcrumbs
              items={[
                { label: "Exercises", onClick: () => setSelectedLevel(null) },
                { label: isIeltsLevel(selectedLevel) ? IELTS_LEVEL.label : selectedLevel! },
              ]}
            />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {isIeltsLevel(selectedLevel) ? (
                IELTS_LEVEL.label
              ) : (
                <>
                  {selectedLevel}{" "}
                  <span className="text-base font-medium text-slate-500">
                    · {LEVEL_LABELS[selectedLevel!] ?? ""}
                  </span>
                </>
              )}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isIeltsLevel(selectedLevel) ? "Choose an exam skill" : "Choose a section"}
            </p>
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
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subjectFolders.map((folder) => {
                const stats = categoryStats(selectedLevel!, folder.id)
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
              const subject = subjectFolders.find((f) => f.id === selectedCategory)
              const isVocab = selectedCategory === "vocabulary"
              const isPodcasts = selectedCategory === "podcasts"
              const isReading = selectedCategory === "reading" && isIeltsLevel(selectedLevel)
              const topics = levelTopics.filter((t) => t.category === selectedCategory)
              const count = isVocab
                ? vocabDecksForLevel.length
                : isPodcasts
                  ? podcastsForLevel.length
                  : isReading
                    ? readings.length
                    : topics.length
              const levelLabel = isIeltsLevel(selectedLevel)
                ? IELTS_LEVEL.label
                : selectedLevel!
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
                    {isReading && readingsLoading ? (
                      <span className="inline-block h-4 w-48 animate-pulse rounded bg-slate-200" />
                    ) : (
                      <>
                        {levelLabel} ·{" "}
                        {isReading && readingTypeFilter
                          ? `${filteredReadings.length} of ${readings.length} passages`
                          : `${count} ${
                              isVocab
                                ? "deck"
                                : isPodcasts
                                  ? "podcast"
                                  : isReading
                                    ? "passage"
                                    : "topic"
                            }${count === 1 ? "" : "s"}`}
                        {isReading && readingTypeFilter ? (
                          <>
                            {" "}
                            · {readingQuestionTypeLabel(readingTypeFilter)}
                          </>
                        ) : null}
                      </>
                    )}
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
                  {count === 0 && !(isReading && readingsLoading) ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                      <p className="font-medium text-slate-900">Coming soon</p>
                      <p className="text-sm text-slate-500">
                        {subject?.label ?? "These"} exercises haven&apos;t been added yet.
                      </p>
                    </div>
                  ) : isVocab ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {vocabDecksForLevel.map((d) => (
                        <VocabDeckCard key={d.slug} deck={d} />
                      ))}
                    </div>
                  ) : isPodcasts ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {podcastsForLevel.map((p) => (
                        <PodcastCard key={p.slug} episode={p} />
                      ))}
                    </div>
                  ) : isReading ? (
                    readingsLoading ? (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-8 w-24 animate-pulse rounded-full bg-slate-200"
                            />
                          ))}
                        </div>
                        <CardGridSkeleton count={6} columns={3} className="mt-4" />
                      </div>
                    ) : (
                      <>
                        {readingQuestionTypes.length > 0 ? (
                          <ReadingTypeFilters
                            types={readingQuestionTypes}
                            readings={readings}
                            activeType={readingTypeFilter}
                            onChange={setReadingTypeFilter}
                          />
                        ) : null}
                        {filteredReadings.length === 0 ? (
                          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                            <p className="font-medium text-slate-900">No passages found</p>
                            <p className="text-sm text-slate-500">
                              {readingTypeFilter
                                ? `No tests with “${readingQuestionTypeLabel(readingTypeFilter)}” questions.`
                                : "Reading passages haven't been added yet."}
                            </p>
                            {readingTypeFilter ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => setReadingTypeFilter(null)}
                              >
                                Show all passages
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                            {filteredReadings.map((r) => (
                              <ReadingPracticeCard key={r.slug} test={r} />
                            ))}
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        "group flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 sm:gap-3 sm:p-5",
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
        "group flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 sm:gap-3 sm:p-5",
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
      <Card className="relative h-full rounded-2xl border-slate-200/80 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg sm:rounded-3xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-sm sm:h-10 sm:w-10"
              >
                <BookMarked className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{deck.title}</h3>
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
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {deck.level}
            </span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:mt-4">{deck.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function PodcastCard({ episode }: { episode: PodcastEpisode }) {
  const hasWords = podcastHasWords(episode)
  return (
    <Card className="relative h-full rounded-2xl border-slate-200/80 bg-white sm:rounded-3xl">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              aria-hidden
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm sm:h-10 sm:w-10"
            >
              <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{episode.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                  {episode.topic}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize">
                  {episode.difficulty}
                </span>
                {hasWords && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    {episode.words.length} words
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {episode.level}
          </span>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          {episode.description || "Listen to this podcast episode."}
        </p>
        {episode.audioUrl && (
          <audio controls className="mt-4 w-full" src={episode.audioUrl} preload="none">
            Your browser does not support audio playback.
          </audio>
        )}
        {hasWords && (
          <p className="mt-3 text-xs text-slate-500">
            Finish listening to see {episode.words.length} words.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ReadingPracticeCard({ test }: { test: IeltsReadingSummary }) {
  const typeLabels = sortReadingQuestionTypes(test.questionTypes ?? []).map(
    readingQuestionTypeLabel,
  )
  return (
    <Link href={`/exercises/ielts/reading/${test.slug}`} className="group block h-full">
      <Card className="relative h-full rounded-2xl border-sky-200/80 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg sm:rounded-3xl">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                aria-hidden
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sm sm:h-10 sm:w-10"
              >
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{test.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  {typeLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-800"
                    >
                      {label}
                    </span>
                  ))}
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">
                    {test.questionCount} questions
                  </span>
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              IELTS
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            IELTS Academic reading with passage and exam-style questions.
          </p>
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
          "relative h-full rounded-2xl border-slate-200/80 bg-white transition-all duration-200 sm:rounded-3xl",
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
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 sm:pb-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 sm:h-10 sm:w-10",
                  isSpeaking
                    ? "bg-gradient-to-br from-rose-200 to-rose-400 ring-rose-300/50"
                    : "bg-gradient-to-br from-amber-200 to-amber-400 ring-amber-300/50",
                )}
              >
                {isSpeaking ? (
                  <Mic className="h-4 w-4 text-rose-900 sm:h-5 sm:w-5" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-900 fill-amber-100 sm:h-5 sm:w-5" />
                )}
              </span>
              <div className="min-w-0 space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{topic.title}</h3>
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
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600 sm:mt-4">
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
