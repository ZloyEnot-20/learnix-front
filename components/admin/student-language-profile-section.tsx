"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Mic,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Student } from "@/lib/admin-storage"
import {
  studentsApi,
  type LanguageProfileHistory,
  type LanguageRecommendation,
  type StudentLanguageProfile,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import { StudentLanguageProfileSkeleton } from "./skeletons"

function formatTopicLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High"
  if (c >= 0.5) return "Medium"
  return "Low"
}

function confidenceClass(c: number): string {
  if (c >= 0.8) return "bg-emerald-100 text-emerald-800"
  if (c >= 0.5) return "bg-sky-100 text-sky-800"
  return "bg-amber-100 text-amber-800"
}

function scoreClass(score: number): string {
  if (score >= 750) return "text-emerald-700"
  if (score >= 550) return "text-sky-700"
  if (score >= 350) return "text-amber-700"
  return "text-rose-700"
}

function priorityClass(p: string): string {
  if (p === "high") return "text-rose-700 bg-rose-50 border-rose-100"
  if (p === "medium") return "text-amber-800 bg-amber-50 border-amber-100"
  return "text-slate-600 bg-slate-50 border-slate-100"
}

function recommendationLabel(rec: LanguageRecommendation): string {
  switch (rec.type) {
    case "review_topic":
      return `Review ${rec.title ?? formatTopicLabel(rec.topic ?? "")}`
    case "practice_topic":
      return `Practice ${rec.title ?? formatTopicLabel(rec.topic ?? "")}`
    case "increase_vocabulary":
      return "Increase vocabulary practice"
    case "improve_fluency":
      return "Improve speaking fluency"
    case "improve_pronunciation":
      return "Improve pronunciation"
    default:
      return rec.title ?? rec.type
  }
}

interface SkillCardProps {
  label: string
  icon: typeof GraduationCap
  color: string
  skill: StudentLanguageProfile["grammar"]
  emptyLabel?: string
}

function SkillCard({ label, icon: Icon, color, skill, emptyLabel }: SkillCardProps) {
  if (!skill.hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{emptyLabel ?? "Not enough data yet"}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}22` }}
          >
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className={cn("text-xl font-bold tabular-nums", scoreClass(skill.score))}>
              {skill.score}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          L{skill.level}
        </Badge>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Confidence: {Math.round(skill.confidence * 100)}%
      </p>
    </div>
  )
}

function LevelCoverageBars({ coverage }: { coverage: Record<string, number> }) {
  const levels = Array.from({ length: 9 }, (_, i) => String(i + 1))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Level coverage
      </p>
      {levels.map((level) => {
        const pct = coverage[level] ?? 0
        const filled = Math.round(pct / 10)
        const bar = "█".repeat(filled) + "░".repeat(10 - filled)
        return (
          <div key={level} className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 font-medium text-slate-600">Level {level}</span>
            <span className="font-mono text-[11px] text-violet-700 tracking-tight">{bar}</span>
            <span className="ml-auto tabular-nums text-slate-500">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ProgressHistoryChart({ history }: { history: LanguageProfileHistory | null }) {
  const chartData = useMemo(() => {
    if (!history?.overall?.length) return []
    return history.overall.map((point, i) => ({
      label: new Date(point.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      grammar: history.grammar[i]?.score ?? null,
      vocabulary: history.vocabulary[i]?.score ?? null,
      speaking: history.speaking[i]?.score ?? null,
      overall: point.score,
    }))
  }, [history])

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
        Progress history will appear after score snapshots are recorded.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <TrendingUp className="h-3.5 w-3.5" />
        Progress history
      </p>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 1000]} tick={{ fontSize: 10 }} width={36} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="grammar" stroke="#fcd5a4" strokeWidth={2} dot={false} name="Grammar" />
            <Line type="monotone" dataKey="vocabulary" stroke="#d8b4fe" strokeWidth={2} dot={false} name="Vocabulary" />
            <Line type="monotone" dataKey="speaking" stroke="#9fcffb" strokeWidth={2} dot={false} name="Speaking" />
            <Line type="monotone" dataKey="overall" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Overall" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface StudentLanguageProfileSectionProps {
  student: Student
}

export function StudentLanguageProfileSection({ student }: StudentLanguageProfileSectionProps) {
  const [profile, setProfile] = useState<StudentLanguageProfile | null>(null)
  const [history, setHistory] = useState<LanguageProfileHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (force = false) => {
      setError(null)
      try {
        const [profileData, historyData] = await Promise.all([
          studentsApi.languageProfile(student.id, force),
          studentsApi.languageProfileHistory(student.id),
        ])
        setProfile(profileData)
        setHistory(historyData)
      } catch {
        setError("Could not load language profile")
        setProfile(null)
        setHistory(null)
      }
    },
    [student.id],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load()
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load(true)
    setRefreshing(false)
  }

  if (loading) {
    return <StudentLanguageProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
        <p className="text-sm text-slate-500">{error ?? "No profile data"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => load(true)}>
          Retry
        </Button>
      </section>
    )
  }

  const hasAnySkill =
    profile.grammar.hasData || profile.vocabulary.hasData || profile.speaking.hasData

  const masteredLabels = profile.masteredTopics.map(formatTopicLabel)
  const recommendations = profile.recommendations ?? []

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            <h3 className="text-sm font-semibold text-slate-900">Learnix Language Profile</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Based on homework, practice, and teacher assessments — not IELTS or CEFR.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={confidenceClass(profile.overall.confidence)}>
            {confidenceLabel(profile.overall.confidence)} confidence
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Force recompute profile"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {!hasAnySkill ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          No measurable grammar, vocabulary, or speaking activity yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 rounded-xl border border-violet-200 bg-violet-50/60 p-4 sm:col-span-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-violet-700/80">
                Overall Score
              </p>
              <p className={cn("mt-1 text-3xl font-bold tabular-nums", scoreClass(profile.overall.score))}>
                {profile.overall.score}
              </p>
              <p className="mt-1 text-xs text-violet-800/70">
                Learnix Level {profile.overall.level}
              </p>
            </div>
            <SkillCard label="Grammar" icon={GraduationCap} color="#fcd5a4" skill={profile.grammar} />
            <SkillCard label="Vocabulary" icon={BookMarked} color="#d8b4fe" skill={profile.vocabulary} />
            <SkillCard
              label="Speaking"
              icon={Mic}
              color="#9fcffb"
              skill={profile.speaking}
              emptyLabel="No speaking assessments yet"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <LevelCoverageBars coverage={profile.levelCoverage ?? {}} />
            <ProgressHistoryChart history={history} />
          </div>

          {recommendations.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Lightbulb className="h-3.5 w-3.5" />
                Recommendations
              </p>
              <ul className="space-y-2">
                {recommendations.map((rec, i) => (
                  <li
                    key={`${rec.type}-${rec.topic ?? i}`}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                      priorityClass(rec.priority),
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {rec.priority === "high" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      ) : null}
                      {recommendationLabel(rec)}
                    </span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {rec.priority}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {profile.speaking.hasData && profile.speaking.dimensions ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Speaking dimensions
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["grammar", "Grammar"],
                    ["vocabulary", "Vocabulary"],
                    ["fluency", "Fluency"],
                    ["pronunciation", "Pronunciation"],
                  ] as const
                ).map(([key, label]) => {
                  const val = profile.speaking.dimensions?.[key] ?? 0
                  return (
                    <div key={key} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-[10px] text-slate-500">{label}</p>
                      <p className={cn("text-lg font-bold tabular-nums", val > 0 ? scoreClass(val) : "text-slate-300")}>
                        {val > 0 ? val : "—"}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-4 text-xs text-slate-600">
            <span>
              Coverage: {profile.coverage.attemptedTopics} / {profile.coverage.totalTopics} topics
            </span>
            <span>Mastered: {profile.coverage.masteredTopics}</span>
            <span>Needs review: {profile.coverage.needsReviewTopics}</span>
            {profile.lastComputedAt ? (
              <span className="text-slate-400">
                Updated {new Date(profile.lastComputedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {masteredLabels.length > 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mastered topics
                </p>
                <ul className="space-y-1">
                  {masteredLabels.slice(0, 8).map((t) => (
                    <li key={t} className="text-xs text-emerald-900">
                      ✅ {t}
                    </li>
                  ))}
                  {masteredLabels.length > 8 ? (
                    <li className="text-[11px] text-emerald-700/70">
                      +{masteredLabels.length - 8} more
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {profile.needsReviewTopics.length > 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Needs review
                </p>
                <ul className="space-y-1">
                  {profile.needsReviewTopics.slice(0, 8).map((slug) => (
                    <li key={slug} className="text-xs text-amber-950">
                      ⚠️ {formatTopicLabel(slug)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  )
}
