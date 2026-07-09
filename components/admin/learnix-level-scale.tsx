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
  formatTopicLabel,
} from "@/lib/language-profile"
import { cn } from "@/lib/utils"

function topicStatus(
  slug: string,
  studentTopics: Map<string, TopicWithSkill>,
): "mastered" | "attempted" | "none" {
  const stat = studentTopics.get(slug)
  if (!stat) return "none"
  if (stat.mastered) return "mastered"
  return "attempted"
}

const STATUS_STYLES = {
  mastered: "border-emerald-200 bg-emerald-50 text-emerald-900",
  attempted: "border-amber-200 bg-amber-50 text-amber-900",
  none: "border-slate-200 bg-slate-50 text-slate-500",
} as const

interface LearnixLevelScaleProps {
  levelCoverage: Record<string, number>
  studentLevel: number
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
    for (const t of studentTopics) map.set(t.slug, t)
    return map
  }, [studentTopics])

  const vocabByLevel = useMemo(() => {
    const map = new Map<number, TopicWithSkill[]>()
    for (const t of studentTopics) {
      if (t.skill !== "vocabulary") continue
      const level = t.learnixLevel ?? 5
      const list = map.get(level) ?? []
      list.push(t)
      map.set(level, list)
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
        What a student should know at each level. Green = mastered, amber = in progress.
      </p>

      <div className="space-y-2">
        {catalogue.map((entry) => {
          const coveragePct = levelCoverage[String(entry.level)] ?? 0
          const isCurrent = entry.level === studentLevel
          const vocabTopics = vocabByLevel.get(entry.level) ?? []
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
                        {coveragePct}%
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="border-t border-slate-200/80 px-3 pb-3 pt-2">
                  {entry.grammarTopics.length > 0 ? (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Grammar topics
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.grammarTopics.map((topic) => {
                          const status = topicStatus(topic.slug, topicMap)
                          return (
                            <span
                              key={topic.slug}
                              className={cn(
                                "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                                STATUS_STYLES[status],
                              )}
                              title={
                                status === "mastered"
                                  ? "Mastered"
                                  : status === "attempted"
                                    ? "In progress"
                                    : "Not started"
                              }
                            >
                              {topic.title}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {vocabTopics.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Vocabulary decks ({entry.vocabularyCefr})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {vocabTopics.map((topic) => (
                          <span
                            key={topic.slug}
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[10px] font-medium",
                              topic.mastered
                                ? STATUS_STYLES.mastered
                                : STATUS_STYLES.attempted,
                            )}
                          >
                            {topic.title || formatTopicLabel(topic.slug)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Vocabulary at {entry.vocabularyCefr} appears when student practices decks at this level.
                    </p>
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
