"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, DatabaseZap, Folder } from "lucide-react"
import { ensureGrammarSeed } from "@/lib/grammar-storage"
import {
  formatDuration,
  buildTopicSummaries,
  type TopicSummary,
} from "@/lib/grammar-utils"
import {
  getExercises,
  getTopicsMeta,
  getLocalCatalog,
  invalidateExercises,
} from "@/lib/exercises-cache"
import { exercisesApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { TopicCardsSkeleton } from "@/components/admin/skeletons"
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
  const { toast } = useToast()
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  const canSync = user ? user.role !== "student" : false

  const refresh = async () => {
    const [exercises, metas] = await Promise.all([getExercises(), getTopicsMeta()])
    setTopics(buildTopicSummaries(exercises, metas))
  }

  useEffect(() => {
    ensureGrammarSeed()
    void refresh().finally(() => setLoading(false))
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { exercises, topics: topicMeta } = getLocalCatalog()
      const result = await exercisesApi.import({ topics: topicMeta, exercises })
      invalidateExercises()
      await refresh()
      toast({
        title: "Catalogue synced to database",
        description: `${result.exercises.received} exercises · ${result.topics.received} folders`,
      })
    } catch (err) {
      toast({
        title: "Could not sync catalogue",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  const grammarTopics = useMemo(
    () => topics.filter((t) => t.category === "grammar"),
    [topics],
  )

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
            {canSync && (
              <Button
                onClick={handleSync}
                loading={syncing}
                className="gap-1.5 bg-[#C8102E] hover:bg-[#A00D25]"
              >
                <DatabaseZap className="h-4 w-4" />
                Sync to database
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {loading && (
          <section>
            <div className="h-5 w-56 rounded-md bg-slate-200 animate-pulse" />
            <div className="mt-4">
              <TopicCardsSkeleton count={6} />
            </div>
          </section>
        )}

        {!loading && grammarTopics.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Choose a Grammar Topic</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each topic hub groups together related exercises, question counts, and level coverage.
            </p>
            <div
              className="mt-4 grid gap-4 justify-center"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 400px))" }}
            >
              {grammarTopics.map((t) => (
                <TopicCard key={t.topic} topic={t} />
              ))}
            </div>
          </section>
        )}

        {!loading && topics.length === 0 && (
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

function TopicCard({ topic }: { topic: TopicSummary }) {
  const lvl = summariseLevels(topic.levels)
  return (
    <Link href={`/exercises/${topic.topic}`} className="group block h-full">
      <Card
        className={cn(
          "relative h-full rounded-3xl border-slate-200/80 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg",
          topic.comingSoon && "opacity-90",
        )}
      >
        {topic.comingSoon && (
          <span className="absolute -top-2 left-6 inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Coming soon
          </span>
        )}
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <span
                aria-hidden
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-400 shadow-sm ring-1 ring-amber-300/50"
              >
                <Folder className="h-5 w-5 text-amber-900 fill-amber-100" />
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
