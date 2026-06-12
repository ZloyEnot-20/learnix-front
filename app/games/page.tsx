"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  BookMarked,
  ChevronLeft,
  Gamepad2,
  Lock,
  Sparkles,
  Trophy,
} from "lucide-react"
import { buildTopicSummaries, type TopicSummary } from "@/lib/grammar-utils"
import { getExercises, getTopicsMeta } from "@/lib/exercises-cache"
import {
  listVocabDecks,
  fetchVocabDecks,
  onVocabDecksInvalidate,
  type VocabDeck,
} from "@/lib/vocabulary-data"
import { useAuth } from "@/lib/auth-context"
import { studentsApi } from "@/lib/api"
import {
  isCefrUnlocked,
  requiredLevelFor,
  type StudentLevel,
} from "@/lib/gamification"
import { LevelScale } from "@/components/student/level-scale"
import { cn } from "@/lib/utils"

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

const LEVELS: { key: string; label: string }[] = [
  { key: "A1", label: "Beginner" },
  { key: "A2", label: "Elementary" },
  { key: "B1", label: "Intermediate" },
  { key: "B2", label: "Upper-Intermediate" },
  { key: "C1", label: "Advanced" },
  { key: "C2", label: "Expert" },
]

const LEVEL_TINT: Record<string, string> = {
  A1: "from-emerald-400 to-green-500",
  A2: "from-lime-400 to-green-500",
  B1: "from-sky-400 to-blue-500",
  B2: "from-amber-400 to-orange-500",
  C1: "from-rose-400 to-pink-500",
  C2: "from-purple-400 to-fuchsia-500",
}

function primaryLevel(levels: string[]): string {
  let best = Number.MAX_SAFE_INTEGER
  for (const l of levels) {
    for (const part of l.split(/[-–]/)) {
      const idx = CEFR_ORDER.indexOf(part.trim().toUpperCase())
      if (idx >= 0 && idx < best) best = idx
    }
  }
  return best === Number.MAX_SAFE_INTEGER ? "A1" : CEFR_ORDER[best]
}

function clampToFixedLevel(level: string): string {
  return CEFR_ORDER.includes(level) ? level : "A1"
}

interface GameItem {
  id: string
  title: string
  subtitle: string
  href: string
  kind: "vocab" | "topic"
}

export default function GamesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [vocabDecks, setVocabDecks] = useState<VocabDeck[]>(() => listVocabDecks())
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (isLoading) return
    if (!user) router.push("/login")
    else if (user.type !== "student") router.push("/admin")
  }, [user, isLoading, router])

  useEffect(() => {
    async function load() {
      const [exercises, metas] = await Promise.all([getExercises(), getTopicsMeta()])
      setTopics(buildTopicSummaries(exercises, metas))
    }
    void load().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const reload = () => void fetchVocabDecks().then(setVocabDecks)
    reload()
    return onVocabDecksInvalidate(reload)
  }, [])

  useEffect(() => {
    if (!user || user.type !== "student") return
    let cancelled = false
    studentsApi
      .level(user.id)
      .then((res) => !cancelled && setStudentLevel(res))
      .catch(() => !cancelled && setStudentLevel(null))
    return () => {
      cancelled = true
    }
  }, [user])

  const playableTopics = useMemo(
    () =>
      topics.filter(
        (t) =>
          (t.category === "grammar" || t.category === "vocabulary") &&
          t.exerciseCount > 0 &&
          !t.comingSoon,
      ),
    [topics],
  )

  const currentLevel = studentLevel?.level ?? 1

  const gamesForLevel = useMemo<GameItem[]>(() => {
    if (!selectedLevel) return []
    const decks: GameItem[] = vocabDecks
      .filter((d) => clampToFixedLevel(primaryLevel([d.level])) === selectedLevel)
      .map((d) => ({
        id: `deck-${d.slug}`,
        title: d.title,
        subtitle: `${d.words.length} words · Flashcards & Quiz`,
        href: `/vocabulary/${d.slug}`,
        kind: "vocab",
      }))
    const topicGames: GameItem[] = playableTopics
      .filter((t) => clampToFixedLevel(primaryLevel(t.levels)) === selectedLevel)
      .map((t) => ({
        id: `topic-${t.topic}`,
        title: t.title,
        subtitle: `${t.exerciseCount} round${t.exerciseCount === 1 ? "" : "s"} · ${t.questionCount} questions`,
        href: `/exercises/${t.topic}`,
        kind: "topic",
      }))
    return [...decks, ...topicGames]
  }, [selectedLevel, vocabDecks, playableTopics])

  const levelStats = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of vocabDecks) {
      const lvl = clampToFixedLevel(primaryLevel([d.level]))
      map.set(lvl, (map.get(lvl) ?? 0) + 1)
    }
    for (const t of playableTopics) {
      const lvl = clampToFixedLevel(primaryLevel(t.levels))
      map.set(lvl, (map.get(lvl) ?? 0) + 1)
    }
    return map
  }, [vocabDecks, playableTopics])

  if (!mounted || isLoading || !user || user.type !== "student") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
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
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Game Station</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Play through your levels to earn points and unlock harder folders.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <LevelScale studentId={user.id} />

        {!selectedLevel && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Choose a level</h2>
            <p className="mt-1 text-sm text-slate-500">
              Reach the required level to unlock the next folder.
            </p>
            <div
              className="mt-4 grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {LEVELS.map(({ key, label }) => {
                const unlocked = isCefrUnlocked(key, currentLevel)
                const count = levelStats.get(key) ?? 0
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={unlocked ? () => setSelectedLevel(key) : undefined}
                    disabled={!unlocked}
                    aria-disabled={!unlocked}
                    className={cn(
                      "group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200",
                      unlocked
                        ? "hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                        : "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                          LEVEL_TINT[key],
                        )}
                      >
                        {unlocked ? (
                          <Sparkles className="h-6 w-6" />
                        ) : (
                          <Lock className="h-6 w-6" />
                        )}
                      </span>
                      {unlocked ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          {key}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          <Lock className="h-3 w-3" />
                          Lvl {requiredLevelFor(key)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{label}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {unlocked
                          ? `${count} game${count === 1 ? "" : "s"}`
                          : `Reach level ${requiredLevelFor(key)} to unlock`}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {selectedLevel && (
          <section>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to levels
            </Button>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {selectedLevel} games
            </h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-400">Loading…</p>
            ) : gamesForLevel.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                <p className="font-medium text-slate-900">No games here yet</p>
                <p className="text-sm text-slate-500">
                  More games for this level are coming soon.
                </p>
              </div>
            ) : (
              <div
                className="mt-4 grid gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
              >
                {gamesForLevel.map((g) => (
                  <Link key={g.id} href={g.href} className="group block h-full">
                    <Card className="h-full rounded-3xl border-violet-200/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                              g.kind === "vocab"
                                ? "bg-gradient-to-br from-violet-400 to-fuchsia-500"
                                : "bg-gradient-to-br from-amber-400 to-orange-500",
                            )}
                          >
                            {g.kind === "vocab" ? (
                              <BookMarked className="h-5 w-5" />
                            ) : (
                              <Trophy className="h-5 w-5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-slate-900">
                              {g.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-slate-500">{g.subtitle}</p>
                          </div>
                        </div>
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                          <Gamepad2 className="h-3.5 w-3.5" />
                          Play
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
