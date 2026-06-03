"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Read-only preview of the upcoming per-topic / per-subtopic analytics.
 * Uses mock data for now; the real numbers will come from
 * `aggregateTopicStats()` once enough attempts are recorded.
 */

interface MockExercise {
  title: string
  type: string
  attempts: number
  accuracy: number
  timeouts: number
}

interface MockSubtopic {
  subtopic: string
  attempts: number
  accuracy: number
  exercises: MockExercise[]
}

interface MockTopic {
  topic: string
  label: string
  attempts: number
  accuracy: number
  timeouts: number
  subtopics: MockSubtopic[]
}

const MOCK_TOPICS: MockTopic[] = [
  {
    topic: "verb-to-be",
    label: "Verb To Be",
    attempts: 142,
    accuracy: 81,
    timeouts: 6,
    subtopics: [
      {
        subtopic: "positive-basic",
        attempts: 48,
        accuracy: 92,
        exercises: [
          { title: "Am, Is, Are (Easy)", type: "fill-in-the-blank", attempts: 26, accuracy: 95, timeouts: 0 },
          { title: "Multiple Choice (Basic)", type: "multiple-choice", attempts: 22, accuracy: 89, timeouts: 1 },
        ],
      },
      {
        subtopic: "questions",
        attempts: 39,
        accuracy: 78,
        exercises: [
          { title: "Yes/No Questions", type: "fill-in-the-blank", attempts: 21, accuracy: 80, timeouts: 2 },
          { title: "Matching subjects", type: "matching", attempts: 18, accuracy: 75, timeouts: 1 },
        ],
      },
      {
        subtopic: "sentence-transformation",
        attempts: 31,
        accuracy: 64,
        exercises: [
          { title: "Contractions", type: "sentence-transformation", attempts: 31, accuracy: 64, timeouts: 2 },
        ],
      },
      {
        subtopic: "true-false",
        attempts: 24,
        accuracy: 58,
        exercises: [
          { title: "True or False", type: "true-false", attempts: 24, accuracy: 58, timeouts: 0 },
        ],
      },
    ],
  },
  {
    topic: "there-is-there-are",
    label: "There Is / There Are",
    attempts: 96,
    accuracy: 69,
    timeouts: 9,
    subtopics: [
      {
        subtopic: "statements",
        attempts: 41,
        accuracy: 74,
        exercises: [
          { title: "Statements", type: "fill-in-the-blank", attempts: 41, accuracy: 74, timeouts: 3 },
        ],
      },
      {
        subtopic: "questions",
        attempts: 35,
        accuracy: 67,
        exercises: [
          { title: "Questions", type: "fill-in-the-blank", attempts: 35, accuracy: 67, timeouts: 4 },
        ],
      },
      {
        subtopic: "uncountable",
        attempts: 20,
        accuracy: 55,
        exercises: [
          { title: "Uncountable nouns", type: "multiple-choice", attempts: 20, accuracy: 55, timeouts: 2 },
        ],
      },
    ],
  },
  {
    topic: "present-simple",
    label: "Present Simple",
    attempts: 78,
    accuracy: 62,
    timeouts: 11,
    subtopics: [
      {
        subtopic: "third-person-s",
        attempts: 44,
        accuracy: 57,
        exercises: [
          { title: "He/She/It + s", type: "word-formation", attempts: 44, accuracy: 57, timeouts: 7 },
        ],
      },
      {
        subtopic: "negatives",
        attempts: 34,
        accuracy: 68,
        exercises: [
          { title: "Don't / Doesn't", type: "fill-in-the-blank", attempts: 34, accuracy: 68, timeouts: 4 },
        ],
      },
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

const TYPE_LABEL: Record<string, string> = {
  "fill-in-the-blank": "Fill in the gaps",
  "multiple-choice": "Multiple choice",
  matching: "Matching",
  "word-formation": "Word formation",
  "sentence-transformation": "Sentence transformation",
  "true-false": "True / False",
}

export default function TopicStatsPanel() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    "verb-to-be": true,
  })

  const overall = useMemo(() => {
    const attempts = MOCK_TOPICS.reduce((a, t) => a + t.attempts, 0)
    const weighted = MOCK_TOPICS.reduce((a, t) => a + t.accuracy * t.attempts, 0)
    const timeouts = MOCK_TOPICS.reduce((a, t) => a + t.timeouts, 0)
    const weakest = [...MOCK_TOPICS].sort((a, b) => a.accuracy - b.accuracy)[0]
    const strongest = [...MOCK_TOPICS].sort((a, b) => b.accuracy - a.accuracy)[0]
    return {
      attempts,
      accuracy: attempts > 0 ? Math.round(weighted / attempts) : 0,
      timeouts,
      weakest,
      strongest,
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-xs text-amber-900">
          <span className="font-semibold">Preview with sample data.</span> Real accuracy per topic
          and subtask is now being collected as students complete exercises. Soon this page will
          show where learners struggle so you know which topics to reinforce.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Attempts" value={String(overall.attempts)} />
        <SummaryCard label="Avg accuracy" value={`${overall.accuracy}%`} accent={accuracyBadge(overall.accuracy)} />
        <SummaryCard label="Time-out fails" value={String(overall.timeouts)} accent="bg-rose-100 text-rose-800" />
        <SummaryCard label="Topics tracked" value={String(MOCK_TOPICS.length)} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3">
          <TrendingDown className="h-4 w-4 shrink-0 text-rose-600" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Needs attention</p>
            <p className="truncate text-sm font-medium text-slate-900">
              {overall.weakest.label} · {overall.weakest.accuracy}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Strongest</p>
            <p className="truncate text-sm font-medium text-slate-900">
              {overall.strongest.label} · {overall.strongest.accuracy}%
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
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                    <span>{topic.attempts} attempts</span>
                    <span>{topic.subtopics.length} subtasks</span>
                    {topic.timeouts > 0 && (
                      <span className="inline-flex items-center gap-1 text-rose-600">
                        <AlertTriangle className="h-3 w-3" />
                        {topic.timeouts} timed out
                      </span>
                    )}
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
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 space-y-3">
                    {topic.subtopics.map((sub) => (
                      <div key={sub.subtopic} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium capitalize text-slate-800">
                            {sub.subtopic.replace(/-/g, " ")}
                          </span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", accuracyBadge(sub.accuracy))}>
                            {sub.accuracy}%
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1.5">
                          {sub.exercises.map((ex) => (
                            <li key={ex.title} className="flex items-center gap-2 text-xs">
                              <span className="flex-1 truncate text-slate-700">{ex.title}</span>
                              <span className="hidden shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 sm:inline">
                                {TYPE_LABEL[ex.type] ?? ex.type}
                              </span>
                              <span className="shrink-0 text-slate-400 tabular-nums">{ex.attempts}×</span>
                              <span className="w-20 shrink-0">
                                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <span className={cn("block h-full rounded-full", accuracyColor(ex.accuracy))} style={{ width: `${ex.accuracy}%` }} />
                                </span>
                              </span>
                              <span className="w-9 shrink-0 text-right font-semibold tabular-nums text-slate-700">
                                {ex.accuracy}%
                              </span>
                            </li>
                          ))}
                        </ul>
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
