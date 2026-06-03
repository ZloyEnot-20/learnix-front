"use client"

import { useState } from "react"
import {
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Read-only preview of the upcoming personal analytics for a student.
 * Uses mock data for now; real numbers will come from recorded attempts.
 */

interface MockSubtopic {
  subtopic: string
  attempts: number
  accuracy: number
}

interface MockTopic {
  topic: string
  label: string
  attempts: number
  accuracy: number
  subtopics: MockSubtopic[]
}

const MOCK_TOPICS: MockTopic[] = [
  {
    topic: "verb-to-be",
    label: "Verb To Be",
    attempts: 12,
    accuracy: 88,
    subtopics: [
      { subtopic: "positive-basic", attempts: 5, accuracy: 96 },
      { subtopic: "questions", attempts: 4, accuracy: 84 },
      { subtopic: "sentence-transformation", attempts: 3, accuracy: 72 },
    ],
  },
  {
    topic: "there-is-there-are",
    label: "There Is / There Are",
    attempts: 8,
    accuracy: 71,
    subtopics: [
      { subtopic: "statements", attempts: 4, accuracy: 78 },
      { subtopic: "questions", attempts: 4, accuracy: 64 },
    ],
  },
  {
    topic: "present-simple",
    label: "Present Simple",
    attempts: 6,
    accuracy: 54,
    subtopics: [
      { subtopic: "third-person-s", attempts: 4, accuracy: 49 },
      { subtopic: "negatives", attempts: 2, accuracy: 63 },
    ],
  },
]

function accuracyColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500"
  if (pct >= 65) return "bg-sky-500"
  if (pct >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

function accuracyBadge(pct: number): string {
  if (pct >= 80) return "bg-emerald-100 text-emerald-800"
  if (pct >= 65) return "bg-sky-100 text-sky-800"
  if (pct >= 50) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}

export default function StudentStatsPanel() {
  const [open, setOpen] = useState<Record<string, boolean>>({ "verb-to-be": true })

  const attempts = MOCK_TOPICS.reduce((a, t) => a + t.attempts, 0)
  const weighted = MOCK_TOPICS.reduce((a, t) => a + t.accuracy * t.attempts, 0)
  const overallAccuracy = attempts > 0 ? Math.round(weighted / attempts) : 0
  const weakest = [...MOCK_TOPICS].sort((a, b) => a.accuracy - b.accuracy)[0]
  const strongest = [...MOCK_TOPICS].sort((a, b) => b.accuracy - a.accuracy)[0]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-900">
          <span className="font-semibold">Preview with sample data.</span> Soon you&apos;ll see your
          accuracy per topic and subtask here, so you know exactly what to practise next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Exercises" value={String(attempts)} />
        <SummaryCard label="Avg accuracy" value={`${overallAccuracy}%`} accent={accuracyBadge(overallAccuracy)} />
        <SummaryCard label="Topics" value={String(MOCK_TOPICS.length)} />
        <SummaryCard label="Day streak" value="12" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Your strength</p>
            <p className="truncate text-sm font-medium text-slate-900">
              {strongest.label} · {strongest.accuracy}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
          <TrendingDown className="h-4 w-4 shrink-0 text-rose-600" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Focus on this</p>
            <p className="truncate text-sm font-medium text-slate-900">
              {weakest.label} · {weakest.accuracy}%
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {MOCK_TOPICS.map((topic) => {
          const isOpen = !!open[topic.topic]
          return (
            <div key={topic.topic} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [topic.topic]: !p[topic.topic] }))}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-90")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-slate-900">{topic.label}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", accuracyBadge(topic.accuracy))}>
                      {topic.accuracy}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cn("h-full rounded-full", accuracyColor(topic.accuracy))} style={{ width: `${topic.accuracy}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    {topic.attempts} exercises · {topic.subtopics.length} subtasks
                  </div>
                </div>
              </button>

              <div
                className={cn(
                  "grid transition-all duration-300 ease-in-out",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2">
                    {topic.subtopics.map((sub) => (
                      <div key={sub.subtopic} className="flex items-center gap-2 text-xs">
                        <span className="flex-1 truncate capitalize text-slate-700">
                          {sub.subtopic.replace(/-/g, " ")}
                        </span>
                        <span className="shrink-0 text-slate-400 tabular-nums">{sub.attempts}×</span>
                        <span className="w-24 shrink-0">
                          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <span className={cn("block h-full rounded-full", accuracyColor(sub.accuracy))} style={{ width: `${sub.accuracy}%` }} />
                          </span>
                        </span>
                        <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-slate-700">
                          {sub.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className={cn("mx-auto w-fit rounded-full px-2 py-0.5 text-base font-bold tabular-nums", accent ?? "text-slate-900")}>
        {value}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}
