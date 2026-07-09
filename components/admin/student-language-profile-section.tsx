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
import { Progress } from "@/components/ui/progress"
import type { Student } from "@/lib/admin-storage"
import {
  studentsApi,
  type LanguageProfileHistory,
  type LanguageRecommendation,
  type LanguageSkillProfile,
  type StudentLanguageProfile,
} from "@/lib/api"
import {
  CEFR_LEVEL_COLORS,
  collectAllTopics,
  confidenceClass,
  confidenceLabel,
  formatTopicLabel,
  groupTopicsByLevel,
  learnixLevelToCefr,
  scoreClass,
  type TopicWithSkill,
} from "@/lib/language-profile"
import { cn } from "@/lib/utils"
import { LearnixLevelScale } from "./learnix-level-scale"
import { StudentLanguageProfileSkeleton } from "./skeletons"

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

const SKILL_META = {
  grammar: { label: "Grammar", icon: GraduationCap, color: "#fcd5a4" },
  vocabulary: { label: "Vocabulary", icon: BookMarked, color: "#d8b4fe" },
  speaking: { label: "Speaking", icon: Mic, color: "#9fcffb" },
} as const

interface SkillCardProps {
  skillKey: keyof typeof SKILL_META
  skill: LanguageSkillProfile
  emptyLabel?: string
}

function SkillCard({ skillKey, skill, emptyLabel }: SkillCardProps) {
  const meta = SKILL_META[skillKey]
  const Icon = meta.icon
  const mastered = skill.topics?.filter((t) => t.mastered).length ?? 0
  const attempted = skill.topics?.length ?? 0
  const cefr = learnixLevelToCefr(skill.level)

  if (!skill.hasData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Icon className="h-4 w-4" style={{ color: meta.color }} />
          <span className="text-sm font-medium">{meta.label}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{emptyLabel ?? "Not enough data yet"}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${meta.color}33` }}
          >
            <Icon className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{meta.label}</p>
            <p className={cn("text-2xl font-bold tabular-nums leading-tight", scoreClass(skill.score))}>
              {skill.score}
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{
              borderColor: `${CEFR_LEVEL_COLORS[cefr] ?? "#94a3b8"}66`,
              color: CEFR_LEVEL_COLORS[cefr] ?? "#64748b",
            }}
          >
            {cefr}
          </Badge>
          <p className="mt-1 text-[10px] text-slate-500">Level {skill.level}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>{mastered} mastered</span>
          <span>{attempted} topics touched</span>
        </div>
        <Progress
          value={attempted > 0 ? (mastered / attempted) * 100 : 0}
          className="h-1.5 bg-slate-100"
        />
        <p className="text-[10px] text-slate-400">
          Confidence {Math.round(skill.confidence * 100)}%
        </p>
      </div>
    </div>
  )
}

function OverallScoreCard({ profile }: { profile: StudentLanguageProfile }) {
  const cefr = learnixLevelToCefr(profile.overall.level)
  const coveragePct =
    profile.coverage.totalTopics > 0
      ? Math.round((profile.coverage.attemptedTopics / profile.coverage.totalTopics) * 100)
      : 0

  return (
    <div className="col-span-2 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 sm:col-span-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-violet-700/80">
        Overall Score
      </p>
      <div className="mt-1 flex items-end gap-2">
        <p
          className={cn("text-3xl font-bold tabular-nums", scoreClass(profile.overall.score))}
        >
          {profile.overall.score}
        </p>
        <Badge
          className="mb-1 text-[10px]"
          style={{
            backgroundColor: `${CEFR_LEVEL_COLORS[cefr] ?? "#7c3aed"}22`,
            color: CEFR_LEVEL_COLORS[cefr] ?? "#7c3aed",
            border: "none",
          }}
        >
          {cefr}
        </Badge>
      </div>
      <p className="mt-1 text-sm font-medium text-violet-900">
        Learnix Level {profile.overall.level}
      </p>
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[10px] text-violet-800/70">
          <span>Catalogue explored</span>
          <span className="tabular-nums">
            {profile.coverage.attemptedTopics} / {profile.coverage.totalTopics} ({coveragePct}%)
          </span>
        </div>
        <Progress value={coveragePct} className="h-1.5 bg-violet-100" />
        <p className="text-[10px] text-violet-700/60">
          {profile.coverage.masteredTopics} mastered · {profile.coverage.needsReviewTopics} need review
        </p>
      </div>
    </div>
  )
}

const SKILL_BADGE: Record<TopicWithSkill["skill"], string> = {
  grammar: "bg-amber-100 text-amber-800",
  vocabulary: "bg-purple-100 text-purple-800",
  speaking: "bg-sky-100 text-sky-800",
}

function TopicsMasteryPanel({ topics }: { topics: TopicWithSkill[] }) {
  const mastered = topics.filter((t) => t.mastered)
  const inProgress = topics.filter((t) => !t.mastered && t.attemptedQuestions >= 3)
  const byLevel = groupTopicsByLevel(mastered)

  if (!mastered.length && !inProgress.length) return null

  return (
    <div className="space-y-4">
      {mastered.length > 0 ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Mastered topics ({mastered.length})
          </p>
          <div className="space-y-3">
            {Array.from(byLevel.entries())
              .sort(([a], [b]) => a - b)
              .map(([level, levelTopics]) => (
                <div key={level}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80">
                    Level {level} · {learnixLevelToCefr(level)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {levelTopics.map((topic) => (
                      <span
                        key={`${topic.skill}-${topic.slug}`}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[10px] text-emerald-900"
                        title={`${topic.weightedAccuracy}% accuracy · ${topic.attemptedQuestions} questions`}
                      >
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[9px] font-semibold uppercase",
                            SKILL_BADGE[topic.skill],
                          )}
                        >
                          {topic.skill.slice(0, 4)}
                        </span>
                        {topic.title || formatTopicLabel(topic.slug)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {inProgress.length > 0 ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <p className="mb-3 text-xs font-semibold text-amber-900">
            In progress ({inProgress.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {inProgress
              .sort((a, b) => b.weightedAccuracy - a.weightedAccuracy)
              .map((topic) => (
                <span
                  key={`${topic.skill}-${topic.slug}`}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] text-amber-950"
                  title={`${topic.weightedAccuracy}% weighted accuracy`}
                >
                  <span
                    className={cn(
                      "rounded px-1 py-0.5 text-[9px] font-semibold uppercase",
                      SKILL_BADGE[topic.skill],
                    )}
                  >
                    {topic.skill.slice(0, 4)}
                  </span>
                  {topic.title || formatTopicLabel(topic.slug)}
                  <span className="text-amber-600">{Math.round(topic.weightedAccuracy)}%</span>
                </span>
              ))}
          </div>
        </div>
      ) : null}
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

  const allTopics = useMemo(
    () => (profile ? collectAllTopics(profile) : []),
    [profile],
  )

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
            <OverallScoreCard profile={profile} />
            <SkillCard skillKey="grammar" skill={profile.grammar} />
            <SkillCard skillKey="vocabulary" skill={profile.vocabulary} />
            <SkillCard
              skillKey="speaking"
              skill={profile.speaking}
              emptyLabel="No speaking assessments yet"
            />
          </div>

          <LearnixLevelScale
            levelCoverage={profile.levelCoverage ?? {}}
            studentLevel={profile.overall.level}
            studentTopics={allTopics}
          />

          <TopicsMasteryPanel topics={allTopics} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ProgressHistoryChart history={history} />

            {profile.needsReviewTopics.length > 0 ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Needs review ({profile.needsReviewTopics.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.needsReviewTopics.map((slug) => (
                    <span
                      key={slug}
                      className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] text-amber-950"
                    >
                      {formatTopicLabel(slug)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                No topics flagged for review.
              </div>
            )}
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

          {profile.lastComputedAt ? (
            <p className="text-right text-[10px] text-slate-400">
              Updated {new Date(profile.lastComputedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
