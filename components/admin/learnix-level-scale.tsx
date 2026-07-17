"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { studentsApi, type LearnixLevelCatalogueEntry } from "@/lib/api"
import {
  CEFR_LEVEL_COLORS,
  type TopicWithSkill,
} from "@/lib/language-profile"
import { cn } from "@/lib/utils"

function topicMasteryStyle(
  slug: string,
  studentTopics: Map<string, TopicWithSkill>,
): { status: "mastered" | "partial" | "attempted" | "none"; score: number } {
  const stat = studentTopics.get(slug)
  if (!stat) return { status: "none", score: 0 }
  const score = stat.masteryScore ?? (stat.mastered ? 85 : stat.attemptedQuestions >= 3 ? Math.round(stat.weightedAccuracy) : 0)
  if (score >= 80 || stat.masteryStatus === "mastered" || stat.mastered) {
    return { status: "mastered", score }
  }
  if (score >= 60 || stat.masteryStatus === "partial") {
    return { status: "partial", score }
  }
  if (stat.attemptedQuestions >= 1) return { status: "attempted", score }
  return { status: "none", score: 0 }
}

const STATUS_STYLES = {
  mastered: "border-emerald-200 bg-emerald-50 text-emerald-900",
  partial: "border-sky-200 bg-sky-50 text-sky-900",
  attempted: "border-amber-200 bg-amber-50 text-amber-900",
  none: "border-slate-200 bg-slate-50 text-slate-500",
} as const

interface LearnixLevelScaleProps {
  levelCoverage: Record<string, number>
  studentLevel: number
  /** Grammar topics only — vocabulary excluded from level scale. */
  studentTopics: TopicWithSkill[]
}

export function LearnixLevelScale({
  levelCoverage,
  studentLevel,
  studentTopics,
}: LearnixLevelScaleProps) {
  const [catalogue, setCatalogue] = useState<LearnixLevelCatalogueEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [openLevel, setOpenLevel] = useState<string | null>(String(studentLevel))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    studentsApi
      .languageProfileLevelCatalogue()
      .then((data) => {
        if (!cancelled) setCatalogue(data)
      })
      .catch(() => {
        if (!cancelled) setCatalogue(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const topicMap = useMemo(() => {
    const map = new Map<string, TopicWithSkill>()
    for (const t of studentTopics) {
      if (t.skill !== "grammar") continue
      map.set(t.slug, t)
    }
    return map
  }, [studentTopics])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!catalogue?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
        Level catalogue unavailable
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Layers className="h-3.5 w-3.5" />
        Learnix level scale
      </p>
      <p className="mb-4 text-[11px] text-slate-500">
        Topic mastery per level. Green ≥80%, blue 60–79%, amber in progress, grey not started.
      </p>

      <div className="space-y-2">
        {catalogue.map((entry) => {
          const coveragePct = levelCoverage[String(entry.level)] ?? 0
          const isCurrent = entry.level === studentLevel
          const levelKey = String(entry.level)

          return (
            <Collapsible
              key={entry.level}
              open={openLevel === levelKey}
              onOpenChange={(open) => setOpenLevel(open ? levelKey : null)}
            >
              <div
                className={cn(
                  "rounded-lg border transition-colors",
                  isCurrent
                    ? "border-violet-300 bg-violet-50/50 ring-1 ring-violet-200"
                    : "border-slate-200 bg-slate-50/40",
                )}
              >
                <CollapsibleTrigger className="flex w-full items-start gap-2 px-3 py-2.5 text-left">
                  {openLevel === levelKey ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Level {entry.level}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: `${CEFR_LEVEL_COLORS[entry.cefr] ?? "#94a3b8"}66`,
                          color: CEFR_LEVEL_COLORS[entry.cefr] ?? "#64748b",
                        }}
                      >
                        {entry.cefr}
                      </Badge>
                      <span className="text-xs text-slate-600">{entry.title}</span>
                      {isCurrent ? (
                        <Badge className="bg-violet-600 text-[10px] text-white">Current</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                      {entry.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={coveragePct}
                        className="h-1.5 flex-1 bg-slate-200"
                      />
                      <span className="shrink-0 text-[10px] tabular-nums text-slate-500">
                        {coveragePct}% topics mastered
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t border-slate-200/80 px-3 pb-3 pt-2">
                  {entry.grammarTopics.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Grammar topics — mastery
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.grammarTopics.map((topic) => {
                          const { status, score } = topicMasteryStyle(topic.slug, topicMap)
                          return (
                            <span
                              key={topic.slug}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                                STATUS_STYLES[status],
                              )}
                              title={
                                score > 0
                                  ? `${score}% mastery`
                                  : status === "none"
                                    ? "Not started"
                                    : "In progress"
                              }
                            >
                              {topic.title}
                              {score > 0 ? (
                                <span className="tabular-nums opacity-80">{score}%</span>
                              ) : null}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">No grammar topics at this level.</p>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
