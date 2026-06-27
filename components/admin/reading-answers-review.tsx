"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import type { HomeworkAttempt } from "@/lib/admin-storage"
import { fetchReading, parseReadingHomeworkSlug } from "@/lib/reading-data"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function ReadingAnswersReview({
  exerciseSlug,
  attempt,
}: {
  exerciseSlug?: string
  attempt: HomeworkAttempt
}) {
  const readingSlug = parseReadingHomeworkSlug(exerciseSlug)
  const [loading, setLoading] = useState(!!readingSlug)
  const [parts, setParts] = useState<Awaited<ReturnType<typeof fetchReading>> | null>(null)

  useEffect(() => {
    if (!readingSlug) {
      setLoading(false)
      setParts(null)
      return
    }
    let cancelled = false
    setLoading(true)
    void fetchReading(readingSlug)
      .then((doc) => {
        if (!cancelled) setParts(doc ?? null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [readingSlug])

  const items = useMemo(() => {
    if (!parts?.data.parts.length) return null
    return buildReadingReviewItems(parts.data.parts, attempt)
  }, [parts, attempt])

  if (!readingSlug) {
    return <LegacyMistakesList attempt={attempt} />
  }

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!items?.length) {
    return <LegacyMistakesList attempt={attempt} />
  }

  const incorrect = items.filter((item) => item.status === "incorrect")
  const correct = items.filter((item) => item.status === "correct")
  const skipped = items.filter((item) => item.status === "skipped")

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">
          <CheckCircle2 className="h-3 w-3" />
          {correct.length} correct
        </span>
        {incorrect.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">
            <XCircle className="h-3 w-3" />
            {incorrect.length} incorrect
          </span>
        )}
        {skipped.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
            <MinusCircle className="h-3 w-3" />
            {skipped.length} skipped
          </span>
        )}
      </div>
      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <li
            key={item.questionId}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              item.status === "correct" && "border-emerald-100 bg-emerald-50/40",
              item.status === "incorrect" && "border-rose-100 bg-white",
              item.status === "skipped" && "border-slate-200 bg-slate-50/60",
            )}
          >
            <p className="text-slate-700">
              <span className="font-semibold text-slate-900">Q{item.questionId}.</span>{" "}
              {item.prompt || "Reading question"}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.status === "skipped" ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <MinusCircle className="h-3 w-3" />
                  Not answered
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    item.status === "correct" ? "text-emerald-700" : "text-rose-700",
                  )}
                >
                  {item.status === "correct" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  Answer: <span className="font-semibold">{item.userAnswer}</span>
                </span>
              )}
              {item.status !== "correct" && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Correct: <span className="font-semibold">{item.correctAnswer}</span>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LegacyMistakesList({ attempt }: { attempt: HomeworkAttempt }) {
  if (attempt.mistakes.length > 0) {
    return (
      <ul className="mt-3 space-y-1.5">
        {attempt.mistakes.map((m) => (
          <li
            key={m.questionId}
            className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs"
          >
            <p className="text-slate-700">
              <span className="font-semibold text-slate-900">Q{m.questionId}.</span> {m.prompt}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 text-rose-700">
                <XCircle className="h-3 w-3" />
                Answer: <span className="font-semibold">{m.userAnswer || "—"}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Correct: <span className="font-semibold">{m.correctAnswer}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (attempt.totalQuestions > 0 && attempt.correctCount >= attempt.totalQuestions) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        All answers correct
      </p>
    )
  }

  if (attempt.totalQuestions > 0) {
    return (
      <p className="mt-2 text-[11px] text-slate-500">
        {attempt.correctCount}/{attempt.totalQuestions} correct — detailed answers were not stored
        for this attempt.
      </p>
    )
  }

  return null
}
