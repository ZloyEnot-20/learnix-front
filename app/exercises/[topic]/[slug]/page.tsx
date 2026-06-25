"use client"

import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Sparkles,
  Target,
  TimerIcon,
  XCircle,
} from "lucide-react"
import { isBlankCorrect } from "@/lib/grammar-storage"
import {
  formatFillBlankCorrectAnswer,
  getAcceptableAnswersForBlank,
} from "@/lib/fill-blank-answers"
import { getExerciseBySlug, peekExerciseBySlug } from "@/lib/exercises-cache"
import { peekHomeworkById, invalidateMyHomework } from "@/lib/homework-cache"
import {
  GRAMMAR_BLANK_TOKEN,
  type GrammarExercise,
} from "@/lib/grammar-types"
import { homeworkApi, analyticsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import SpeakingRunner from "@/components/exercises/speaking-runner"

/** Normalized review item shared between exercise types. */
interface ReviewItem {
  id: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
}

export default function ExerciseRunnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          Loading exercise…
        </div>
      }
    >
      <ExerciseRunner />
    </Suspense>
  )
}

function ExerciseRunner() {
  const params = useParams<{ topic: string; slug: string }>()
  const topic = params?.topic
  const slug = params?.slug
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Seed synchronously from the warm cache so navigating here from the homework
  // page shows the exercise instantly (no loading flash).
  const [exercise, setExercise] = useState<GrammarExercise | null>(() =>
    slug ? (peekExerciseBySlug(slug) ?? null) : null,
  )

  useEffect(() => {
    if (!slug) return
    // Already resolved from cache — nothing to fetch.
    if (exercise) return
    let cancelled = false
    getExerciseBySlug(slug)
      .then((ex) => {
        if (cancelled) return
        if (!ex) {
          router.replace("/exercises")
          return
        }
        setExercise(ex)
      })
      .catch(() => {
        if (!cancelled) router.replace("/exercises")
      })
    return () => {
      cancelled = true
    }
  }, [slug, router, exercise])

  const backHref = topic ? `/exercises/${topic}` : "/exercises"
  const homeworkId = searchParams?.get("hw") ?? undefined
  const studentId = user?.type === "student" ? user.id : undefined
  // Initialise the time limit from cached homework so there's no request when
  // opening an assignment that was just listed on the homework page.
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(
    () => (homeworkId ? peekHomeworkById(homeworkId)?.timeLimitMinutes : undefined),
  )

  // For homework, wait for the server start timestamp so the timer resumes correctly.
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(
    homeworkId ? null : Date.now(),
  )

  // Mark the assignment as started, and fetch the time limit only if it wasn't
  // already available from the cache.
  useEffect(() => {
    if (!homeworkId) return
    let cancelled = false
    if (peekHomeworkById(homeworkId) === undefined) {
      homeworkApi
        .get(homeworkId)
        .then((hw) => {
          if (!cancelled) setTimeLimitMinutes(hw?.timeLimitMinutes)
        })
        .catch(() => {})
    }
    if (studentId) {
      // Starting flips the submission to "in_progress"; drop the cached list so
      // the homework section reflects the new status next time it opens.
      void homeworkApi
        .start(homeworkId)
        .then((sub) => {
          if (cancelled) return
          setSessionStartedAt(
            sub.startedAt ? new Date(sub.startedAt).getTime() : Date.now(),
          )
          invalidateMyHomework()
        })
        .catch(() => {
          if (!cancelled) setSessionStartedAt(Date.now())
        })
    } else {
      setSessionStartedAt(Date.now())
    }
    return () => {
      cancelled = true
    }
  }, [homeworkId, studentId])

  if (!exercise || sessionStartedAt === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading exercise…
      </div>
    )
  }

  const common = {
    exercise,
    backHref,
    homeworkId,
    studentId,
    timeLimitMinutes,
    sessionStartedAt,
  }
  switch (exercise.type) {
    case "multiple-choice":
      return <MultipleChoiceRunner {...common} />
    case "matching":
      return <MatchingRunner {...common} />
    case "true-false":
      return <TrueFalseRunner {...common} />
    case "word-formation":
    case "sentence-transformation":
      return <TextAnswerRunner {...common} />
    case "error-correction":
      return <ErrorCorrectionRunner {...common} />
    case "word-order":
      return <WordOrderRunner {...common} />
    case "speaking":
      return <SpeakingRunner {...common} />
    default:
      return <FillBlankRunner {...common} />
  }
}

/** Case-insensitive comparison tolerant of apostrophe style and trailing punctuation. */
function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.?!]+$/g, "")
    .trim()
}

function remainingSeconds(
  minutes: number | undefined,
  startedAtMs: number,
): number | null {
  if (!minutes || minutes <= 0) return null
  const total = Math.round(minutes * 60)
  const elapsed = Math.floor((Date.now() - startedAtMs) / 1000)
  return Math.max(0, total - elapsed)
}

/**
 * Per-exercise countdown. Returns remaining seconds (or null when unlimited).
 * Calls `onExpire` once when it reaches zero. Pauses while `stopped` is true.
 */
function useCountdown(
  minutes: number | undefined,
  onExpire: () => void,
  stopped: boolean,
  startedAtMs: number,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    remainingSeconds(minutes, startedAtMs),
  )
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setSecondsLeft(remainingSeconds(minutes, startedAtMs))
  }, [minutes, startedAtMs])

  useEffect(() => {
    if (secondsLeft == null || stopped) return
    if (secondsLeft <= 0) {
      onExpireRef.current()
      return
    }
    const t = setTimeout(
      () => setSecondsLeft((s) => (s == null ? null : s - 1)),
      1000,
    )
    return () => clearTimeout(t)
  }, [secondsLeft, stopped])

  return secondsLeft
}

type ExerciseRunnerProps = {
  exercise: GrammarExercise
  backHref: string
  homeworkId?: string
  studentId?: string
  timeLimitMinutes?: number
  sessionStartedAt: number
}

// ─── Fill in the blank runner ───────────────────────────────────────────────

function FillBlankRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const [index, setIndex] = useState(0)
  const [inputs, setInputs] = useState<string[]>([])
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [perBlank, setPerBlank] = useState<boolean[]>([])
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const questions = exercise.content.questions ?? []
  const question = questions[index] ?? null

  const segments = useMemo(() => {
    if (!question) return [] as string[]
    return question.text.split(GRAMMAR_BLANK_TOKEN)
  }, [question])

  const blanksCount = Math.max(segments.length - 1, 0)

  useEffect(() => {
    setInputs(Array.from({ length: blanksCount }, () => ""))
    setPerBlank([])
    setResult("idle")
    setShowHint(false)
  }, [blanksCount, index])

  const allFilled = inputs.length > 0 && inputs.every((v) => v.trim().length > 0)

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || !allFilled) return
    const checks = inputs.map((val, i) =>
      isBlankCorrect(val, getAcceptableAnswersForBlank(question, i)),
    )
    const allCorrect = checks.every(Boolean)
    setPerBlank(checks)
    setResult(allCorrect ? "correct" : "incorrect")
    if (allCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: inputs.map((s) => s.trim()).filter(Boolean).join(" / "),
          correctAnswer: formatFillBlankCorrectAnswer(question),
          explanation: question.explanation,
        },
      ])
    }
  }, [allFilled, inputs, question, result])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (result === "idle") handleCheck()
    else handleNext()
  }

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            {question.instruction && question.instruction !== "Complete the question." && (
              <p className="text-sm text-slate-500">{question.instruction}</p>
            )}

            <div className="text-lg leading-relaxed text-slate-900 flex flex-wrap items-baseline gap-y-2">
              {segments.map((seg, i) => (
                <Fragment key={i}>
                  {seg && <span className="whitespace-pre-wrap">{seg}</span>}
                  {i < blanksCount && (
                    <BlankInput
                      key={`q${index}-b${i}`}
                      value={inputs[i] ?? ""}
                      onChange={(val) => {
                        setInputs((prev) => {
                          const next = [...prev]
                          next[i] = val
                          return next
                        })
                      }}
                      onKeyDown={handleKeyDown}
                      result={result}
                      correct={perBlank[i]}
                      autoFocus={i === 0}
                      placeholder={
                        result !== "idle" && perBlank[i] === false
                          ? question.blanks?.[i]
                          : undefined
                      }
                    />
                  )}
                </Fragment>
              ))}
            </div>

            <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={formatFillBlankCorrectAnswer(question)}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck={allFilled}
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Multiple choice runner ─────────────────────────────────────────────────

function MultipleChoiceRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [showHint, setShowHint] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const questions = exercise.content.questions ?? []
  const question = questions[index] ?? null

  useEffect(() => {
    setSelected(null)
    setResult("idle")
    setShowHint(false)
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || selected == null) return
    const isCorrect = selected === question.correctAnswer
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: selected,
          correctAnswer: question.correctAnswer ?? "",
          explanation: question.explanation,
        },
      ])
    }
  }, [question, result, selected])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  const options = question.options ?? []
  const renderedText = question.text.replace(GRAMMAR_BLANK_TOKEN, "_____")

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            <p className="text-lg leading-relaxed text-slate-900">{renderedText}</p>

            <div className="grid gap-2.5">
              {options.map((opt) => {
                const isChosen = selected === opt
                const isCorrectOpt = opt === question.correctAnswer
                const checked = result !== "idle"
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={checked}
                    onClick={() => setSelected(opt)}
                    aria-pressed={isChosen}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition-all",
                      !checked && isChosen && "border-blue-500 bg-blue-50 text-slate-900 ring-1 ring-blue-500",
                      !checked && !isChosen && "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      checked && isCorrectOpt && "border-emerald-500 bg-emerald-50 text-emerald-900",
                      checked && isChosen && !isCorrectOpt && "border-rose-500 bg-rose-50 text-rose-900",
                      checked && !isChosen && !isCorrectOpt && "border-slate-200 bg-white text-slate-400",
                      checked && "cursor-default",
                    )}
                  >
                    <span className="font-medium">{opt}</span>
                    {checked && isCorrectOpt && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    )}
                    {checked && isChosen && !isCorrectOpt && (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    )}
                  </button>
                )
              })}
            </div>

            <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={question.correctAnswer ?? ""}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck={selected != null}
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Text answer runner (word-formation / sentence-transformation) ──────────

function TextAnswerRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const questions = exercise.content.questions ?? []
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState("")
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const question = questions[index] ?? null

  useEffect(() => {
    setInput("")
    setResult("idle")
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || input.trim().length === 0) return
    const expected = question.answer ?? ""
    const accepted = [expected, ...(question.accepted ?? [])].filter((a) => a.length > 0)
    const typed = normalizeAnswer(input)
    const isCorrect = accepted.some((a) => normalizeAnswer(a) === typed)
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: input.trim(),
          correctAnswer: expected,
          explanation: question.explanation,
        },
      ])
    }
  }, [input, question, result])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    if (result === "idle") handleCheck()
    else handleNext()
  }

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            {exercise.instructions && (
              <p className="text-sm text-slate-500">{exercise.instructions}</p>
            )}

            <p className="text-lg leading-relaxed text-slate-900">{question.text}</p>

            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={result !== "idle"}
              placeholder="Type your answer…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2",
                result === "idle" &&
                  "border-slate-200 bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-200",
                result === "correct" &&
                  "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold focus:ring-0",
                result === "incorrect" &&
                  "border-rose-500 bg-rose-50 text-rose-900 font-semibold focus:ring-0",
              )}
            />

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={question.answer ?? ""}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck={input.trim().length > 0}
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Error correction runner (click a wrong chunk and fix it) ────────────────

function ErrorCorrectionRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const questions = exercise.content.questions ?? []
  const [index, setIndex] = useState(0)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const question = questions[index] ?? null
  const segments = question?.segments ?? []

  useEffect(() => {
    setEdits({})
    setEditingId(null)
    setShowHint(false)
    setResult("idle")
  }, [index])

  const rebuild = useCallback(
    () => segments.map((s) => (edits[s.id] ?? s.text) + (s.after ?? "")).join("").trim(),
    [segments, edits],
  )

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle") return
    const rebuilt = rebuild()
    const accepted = [question.answer ?? "", ...(question.accepted ?? [])].filter(
      (a) => a.length > 0,
    )
    const isCorrect = accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(rebuilt))
    setEditingId(null)
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: rebuilt,
          correctAnswer: question.answer ?? "",
          explanation: question.explanation,
        },
      ])
    }
  }, [question, result, rebuild])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            {exercise.instructions && (
              <p className="text-sm text-slate-500">{exercise.instructions}</p>
            )}

            <div className="text-lg leading-loose text-slate-900">
              {segments.map((seg) => {
                const value = edits[seg.id] ?? seg.text
                const changed = value !== seg.text
                const isEditing = editingId === seg.id
                return (
                  <span key={seg.id}>
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={value}
                        onChange={(e) =>
                          setEdits((m) => ({ ...m, [seg.id]: e.target.value }))
                        }
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            setEditingId(null)
                          }
                        }}
                        style={{ width: `${Math.max(value.length, 3) + 1}ch` }}
                        className="rounded-md border border-blue-400 bg-blue-50 px-1.5 py-0.5 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    ) : (
                      <button
                        type="button"
                        title={seg.hint}
                        onClick={() => result === "idle" && setEditingId(seg.id)}
                        disabled={result !== "idle"}
                        className={cn(
                          "rounded-md px-1 py-0.5 transition-colors",
                          result === "idle" &&
                            "cursor-pointer hover:bg-amber-100 hover:ring-1 hover:ring-amber-200",
                          changed
                            ? "bg-amber-100 font-semibold text-amber-900 underline decoration-dotted underline-offset-4"
                            : "text-slate-900",
                        )}
                      >
                        {value}
                      </button>
                    )}
                    <span className="whitespace-pre">{seg.after ?? ""}</span>
                  </span>
                )
              })}
            </div>

            {result === "idle" && (
              <p className="text-xs text-slate-400">
                Click a chunk to fix it. Leave the sentence unchanged if it is already correct.
              </p>
            )}

            {question.hint && result === "idle" && (
              <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
            )}

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={question.answer ?? ""}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Word order runner (arrange the scrambled words) ─────────────────────────

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => normalizeAnswer(x) === normalizeAnswer(b[i]))
}

function WordOrderRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const questions = exercise.content.questions ?? []
  const [index, setIndex] = useState(0)
  const [order, setOrder] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const question = questions[index] ?? null
  const scrambled = question?.scrambled ?? []
  const prefix = question?.prefix ?? []
  const suffix = question?.suffix ?? []

  const correctSentence = [...prefix, ...(question?.correct ?? []), ...suffix].join(" ")

  useEffect(() => {
    setOrder([])
    setShowHint(false)
    setResult("idle")
  }, [index])

  const placeWord = (i: number) => {
    if (result !== "idle" || order.includes(i)) return
    setOrder((o) => [...o, i])
  }
  const removeWord = (i: number) => {
    if (result !== "idle") return
    setOrder((o) => o.filter((x) => x !== i))
  }

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || order.length !== scrambled.length) return
    const arranged = order.map((i) => scrambled[i])
    const candidates = [question.correct ?? [], ...(question.alternates ?? [])]
    const isCorrect = candidates.some((c) => arraysEqual(arranged, c))
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: [...prefix, ...scrambled, ...suffix].join(" "),
          userAnswer: [...prefix, ...arranged, ...suffix].join(" "),
          correctAnswer: correctSentence,
          explanation: question.explanation,
        },
      ])
    }
  }, [question, result, order, scrambled, prefix, suffix, correctSentence])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            {exercise.instructions && (
              <p className="text-sm text-slate-500">{exercise.instructions}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 text-lg text-slate-900">
              {prefix.map((w, i) => (
                <span key={`p-${i}`} className="text-slate-400">
                  {w}
                </span>
              ))}
              {order.length === 0 ? (
                <span className="rounded-md border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-400">
                  tap the words below
                </span>
              ) : (
                order.map((wi) => (
                  <button
                    key={`a-${wi}`}
                    type="button"
                    onClick={() => removeWord(wi)}
                    disabled={result !== "idle"}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-base font-medium transition-colors",
                      result === "idle"
                        ? "border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100"
                        : "border-slate-200 bg-white text-slate-900",
                    )}
                  >
                    {scrambled[wi]}
                  </button>
                ))
              )}
              {suffix.map((w, i) => (
                <span key={`s-${i}`} className="text-slate-400">
                  {w}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {scrambled.map((w, i) => {
                const used = order.includes(i)
                return (
                  <button
                    key={`c-${i}`}
                    type="button"
                    onClick={() => placeWord(i)}
                    disabled={used || result !== "idle"}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-base font-medium transition-colors",
                      used
                        ? "cursor-default border-slate-100 bg-slate-50 text-slate-300"
                        : "border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50",
                    )}
                  >
                    {w}
                  </button>
                )
              })}
            </div>

            {question.hint && result === "idle" && (
              <HintRow showHint={showHint} setShowHint={setShowHint} hint={question.hint} />
            )}

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={correctSentence}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck={order.length === scrambled.length}
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── True / false runner ────────────────────────────────────────────────────

function TrueFalseRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const questions = exercise.content.questions ?? []
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<boolean | null>(null)
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle")
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState<ReviewItem[]>([])
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  const question = questions[index] ?? null

  useEffect(() => {
    setSelected(null)
    setResult("idle")
  }, [index])

  const handleCheck = useCallback(() => {
    if (!question || result !== "idle" || selected == null) return
    const isCorrect = selected === question.correctBool
    setResult(isCorrect ? "correct" : "incorrect")
    if (isCorrect) {
      setCorrectCount((c) => c + 1)
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          id: question.id,
          prompt: question.text,
          userAnswer: selected ? "Correct" : "Incorrect",
          correctAnswer: question.correctBool ? "Correct" : "Incorrect",
          explanation: question.explanation,
        },
      ])
    }
  }, [question, result, selected])

  const handleNext = useCallback(() => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      setFinishedAt(Date.now())
      return
    }
    setIndex((i) => i + 1)
  }, [questions.length, index])

  const total = questions.length
  const progressPct = Math.round(((finished ? total : index) / total) * 100)

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (!question) return null

  const checked = result !== "idle"
  const options: { value: boolean; label: string }[] = [
    { value: true, label: "Correct" },
    { value: false, label: "Incorrect" },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <ProgressBar index={index} total={total} correctCount={correctCount} progressPct={progressPct} />

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>

            {exercise.instructions && (
              <p className="text-sm text-slate-500">{exercise.instructions}</p>
            )}

            <p className="text-lg leading-relaxed text-slate-900">
              &ldquo;{question.text}&rdquo;
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {options.map((opt) => {
                const isChosen = selected === opt.value
                const isCorrectOpt = opt.value === question.correctBool
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={checked}
                    onClick={() => setSelected(opt.value)}
                    aria-pressed={isChosen}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-medium transition-all",
                      !checked && isChosen && "border-blue-500 bg-blue-50 text-slate-900 ring-1 ring-blue-500",
                      !checked && !isChosen && "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      checked && isCorrectOpt && "border-emerald-500 bg-emerald-50 text-emerald-900",
                      checked && isChosen && !isCorrectOpt && "border-rose-500 bg-rose-50 text-rose-900",
                      checked && !isChosen && !isCorrectOpt && "border-slate-200 bg-white text-slate-400",
                      checked && "cursor-default",
                    )}
                  >
                    {checked && isCorrectOpt && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                    {checked && isChosen && !isCorrectOpt && <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {result !== "idle" && (
              <FeedbackBox
                correct={result === "correct"}
                correctAnswer={question.correctBool ? "Correct" : "Incorrect"}
                explanation={question.explanation}
              />
            )}

            <ActionRow
              result={result}
              canCheck={selected != null}
              isLast={index + 1 >= total}
              onCheck={handleCheck}
              onNext={handleNext}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Matching runner ────────────────────────────────────────────────────────

function MatchingRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  timeLimitMinutes,
  sessionStartedAt,
}: ExerciseRunnerProps) {
  const pairs = exercise.content.pairs ?? []
  const [picks, setPicks] = useState<(string | null)[]>(() => pairs.map(() => null))
  const [checked, setChecked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const secondsLeft = useCountdown(
    timeLimitMinutes,
    () => {
      setTimedOut(true)
      setFinished(true)
      setFinishedAt(Date.now())
    },
    finished,
    sessionStartedAt,
  )

  // Distinct right-hand options, preserving first-seen order.
  const options = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of pairs) {
      if (!seen.has(p.right)) {
        seen.add(p.right)
        out.push(p.right)
      }
    }
    return out
  }, [pairs])

  const total = pairs.length
  const allAnswered = picks.length === total && picks.every((p) => p != null)
  const correctCount = useMemo(
    () => pairs.reduce((acc, p, i) => acc + (picks[i] === p.right ? 1 : 0), 0),
    [pairs, picks],
  )

  const mistakes: ReviewItem[] = useMemo(
    () =>
      pairs
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => picks[i] !== p.right)
        .map(({ p, i }) => ({
          id: i + 1,
          prompt: p.left,
          userAnswer: picks[i] ?? "—",
          correctAnswer: p.right,
          explanation: `${p.left} → ${p.right}`,
        })),
    [pairs, picks],
  )

  if (finished) {
    return (
      <ResultsScreen
        exercise={exercise}
        backHref={backHref}
        correctCount={correctCount}
        total={total}
        startedAt={sessionStartedAt}
        finishedAt={finishedAt}
        mistakes={mistakes}
        homeworkId={homeworkId}
        studentId={studentId}
        timedOut={timedOut}
      />
    )
  }

  if (total === 0) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader
        exercise={exercise}
        backHref={backHref}
        secondsLeft={secondsLeft}
        hideBack={!!homeworkId}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-slate-900">Match all {total} pairs</p>
          {checked && (
            <p className="text-slate-500">
              <span className="font-semibold text-slate-900 tabular-nums">{correctCount}</span> / {total} correct
            </p>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-4">
            {exercise.instructions && (
              <p className="text-sm text-slate-500">{exercise.instructions}</p>
            )}

            <ul className="space-y-3">
              {pairs.map((pair, i) => {
                const pick = picks[i]
                const isRowCorrect = pick === pair.right
                return (
                  <li
                    key={i}
                    className={cn(
                      "rounded-xl border p-3 sm:p-4",
                      !checked && "border-slate-200 bg-white",
                      checked && isRowCorrect && "border-emerald-300 bg-emerald-50/60",
                      checked && !isRowCorrect && "border-rose-300 bg-rose-50/60",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="min-w-[3rem] text-base font-semibold text-slate-900">
                        {pair.left}
                      </span>
                      <span className="text-slate-300">→</span>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt) => {
                          const isChosen = pick === opt
                          const isCorrectOpt = opt === pair.right
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={checked}
                              onClick={() =>
                                setPicks((prev) => {
                                  const next = [...prev]
                                  next[i] = opt
                                  return next
                                })
                              }
                              aria-pressed={isChosen}
                              className={cn(
                                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                                !checked && isChosen && "border-blue-500 bg-blue-50 text-slate-900 ring-1 ring-blue-500",
                                !checked && !isChosen && "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                                checked && isChosen && isCorrectOpt && "border-emerald-500 bg-emerald-100 text-emerald-900",
                                checked && isChosen && !isCorrectOpt && "border-rose-500 bg-rose-100 text-rose-900 line-through",
                                checked && !isChosen && isCorrectOpt && "border-emerald-400 bg-emerald-50 text-emerald-800",
                                checked && !isChosen && !isCorrectOpt && "border-slate-200 bg-white text-slate-400",
                                checked && "cursor-default",
                              )}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                      {checked && (
                        <span className="ml-auto">
                          {isRowCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-rose-600" />
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex items-center justify-center pt-1">
              {!checked ? (
                <Button
                  onClick={() => setChecked(true)}
                  disabled={!allAnswered}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:text-white disabled:opacity-100"
                >
                  Check Answers
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setFinished(true)
                    setFinishedAt(Date.now())
                  }}
                  className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  See results
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Shared building blocks ─────────────────────────────────────────────────

function ProgressBar({
  index,
  total,
  correctCount,
  progressPct,
}: {
  index: number
  total: number
  correctCount: number
  progressPct: number
}) {
  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-slate-900">
          Question {index + 1} of {total}
        </p>
        <p className="text-slate-500">
          <span className="font-semibold text-slate-900 tabular-nums">{correctCount}</span> correct so far
        </p>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </>
  )
}

function HintRow({
  showHint,
  setShowHint,
  hint,
}: {
  showHint: boolean
  setShowHint: (fn: (v: boolean) => boolean) => void
  hint?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          showHint
            ? "border-amber-300 bg-amber-100 text-amber-900"
            : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        hint
        <ChevronRight
          className={cn("h-3.5 w-3.5 transition-transform", showHint && "rotate-90")}
        />
      </button>
      {showHint && hint && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
          {hint}
        </p>
      )}
    </div>
  )
}

function FeedbackBox({
  correct,
  correctAnswer,
  explanation,
}: {
  correct: boolean
  correctAnswer: string
  explanation?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        correct
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900",
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        {correct ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Correct!
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4" />
            Not quite — correct answer:{" "}
            <span className="font-bold">{correctAnswer}</span>
          </>
        )}
      </div>
      {explanation && (
        <p className="mt-1.5 text-[13px] text-slate-700">{explanation}</p>
      )}
    </div>
  )
}

function ActionRow({
  result,
  canCheck,
  isLast,
  onCheck,
  onNext,
}: {
  result: "idle" | "correct" | "incorrect"
  canCheck: boolean
  isLast: boolean
  onCheck: () => void
  onNext: () => void
}) {
  return (
    <div className="flex items-center justify-center pt-1">
      {result === "idle" ? (
        <Button
          onClick={onCheck}
          disabled={!canCheck}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-200 disabled:text-white disabled:opacity-100"
        >
          Check Answer
        </Button>
      ) : (
        <Button onClick={onNext} className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
          {isLast ? "See results" : "Next question"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

function ResultsScreen({
  exercise,
  backHref,
  correctCount,
  total,
  startedAt,
  finishedAt,
  mistakes,
  homeworkId,
  studentId,
  timedOut,
}: {
  exercise: GrammarExercise
  backHref: string
  correctCount: number
  total: number
  startedAt: number
  finishedAt: number | null
  mistakes: ReviewItem[]
  homeworkId?: string
  studentId?: string
  timedOut?: boolean
}) {
  const elapsedMs = (finishedAt ?? Date.now()) - startedAt
  const minutes = Math.max(1, Math.round(elapsedMs / 60000))
  const answeredCount = correctCount + mistakes.length
  const passed = !timedOut && correctCount >= exercise.passingScore
  const scorePct = Math.round((correctCount / total) * 100)

  // Guard against React StrictMode double-invoking this effect in dev, which
  // would POST the attempt twice and create duplicate notifications.
  const recorded = useRef(false)

  // When the exercise was opened from a homework assignment, record the
  // student's attempt so it shows as submitted on their dashboard and to the
  // teacher. Runs once when the results screen mounts.
  useEffect(() => {
    if (recorded.current) return
    recorded.current = true

    // Always record topic/subtopic accuracy for analytics (any run).
    void analyticsApi
      .record({
        topic: exercise.topic,
        subtopic: exercise.subtopic,
        slug: exercise.slug,
        title: exercise.title,
        type: exercise.type,
        correctCount,
        totalQuestions: total,
        timedOut: timedOut || undefined,
        studentId,
      })
      .catch(() => {})

    if (!homeworkId || !studentId) return
    void homeworkApi
      .recordAttempt(homeworkId, {
        totalQuestions: total,
        correctCount,
        durationSeconds: Math.round(elapsedMs / 1000),
        timedOut: timedOut || undefined,
        answeredCount,
        mistakes: mistakes.map((m) => ({
          questionId: m.id,
          prompt: m.prompt,
          userAnswer: m.userAnswer,
          correctAnswer: m.correctAnswer,
          explanation: m.explanation,
        })),
      })
      // The submission status changed — refresh the cached homework list so the
      // student's homework section reflects it on return.
      .then(() => invalidateMyHomework())
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (timedOut) {
    const unanswered = total - answeredCount
    return (
      <div className="min-h-screen bg-slate-50">
        <ExerciseHeader exercise={exercise} backHref={backHref} hideBack={!!homeworkId} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <Card className="overflow-hidden">
            <div className="h-1.5 w-full bg-rose-500" />
            <CardContent className="pt-6 pb-8">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <TimerIcon className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Time&apos;s up!</h2>
                <p className="text-sm text-slate-500">
                  You ran out of time before finishing. This attempt is marked as failed due to
                  the time limit
                  {unanswered > 0
                    ? ` — ${unanswered} question${unanswered === 1 ? "" : "s"} left unanswered.`
                    : "."}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-md">
                  <SummaryStat icon={Target} label="Answered" value={`${answeredCount}/${total}`} />
                  <SummaryStat icon={CheckCircle2} label="Correct" value={`${correctCount}`} />
                  <SummaryStat icon={Clock} label="Time" value={`${minutes} min`} />
                </div>
                <div className="mt-4 flex items-center justify-center">
                  <Link href="/dashboard">
                    <Button className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
                      <ArrowLeft className="h-4 w-4" />
                      Back to main menu
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          <MistakesReview mistakes={mistakes} total={total} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ExerciseHeader exercise={exercise} backHref={backHref} hideBack={!!homeworkId} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="overflow-hidden">
          <div className={cn("h-1.5 w-full", passed ? "bg-emerald-500" : "bg-rose-500")} />
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full",
                  passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                )}
              >
                {passed ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {passed ? "Well done!" : "Almost there"}
              </h2>
              <p className="text-sm text-slate-500">
                {passed
                  ? `You reached the passing score of ${exercise.passingScore}/${total}.`
                  : `You needed ${exercise.passingScore}/${total} to pass. Try again to improve.`}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-md">
                <SummaryStat icon={Target} label="Score" value={`${correctCount}/${total}`} />
                <SummaryStat icon={Sparkles} label="Accuracy" value={`${scorePct}%`} />
                <SummaryStat icon={Clock} label="Time" value={`${minutes} min`} />
              </div>
              <div className="mt-4 flex items-center justify-center">
                <Link href="/dashboard">
                  <Button className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
                    <ArrowLeft className="h-4 w-4" />
                    Back to main menu
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <MistakesReview mistakes={mistakes} total={total} />
      </div>
    </div>
  )
}

function ExerciseHeader({
  exercise,
  backHref,
  secondsLeft,
  hideBack,
}: {
  exercise: GrammarExercise
  backHref: string
  secondsLeft?: number | null
  hideBack?: boolean
}) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        {(!hideBack || secondsLeft != null) && (
          <div className="flex items-start justify-between gap-3">
            {hideBack ? (
              <span />
            ) : (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to topic
              </Link>
            )}
            {secondsLeft != null && <TimerBadge secondsLeft={secondsLeft} />}
          </div>
        )}
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{exercise.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{exercise.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            Level: <span className="font-semibold text-slate-700">{exercise.level}</span>
          </span>
          <span>
            Questions:{" "}
            <span className="font-semibold text-slate-700">{exercise.totalQuestions}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function TimerBadge({ secondsLeft }: { secondsLeft: number }) {
  const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
  const ss = Math.max(secondsLeft, 0) % 60
  const low = secondsLeft <= 60
  const out = secondsLeft <= 0
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xl font-extrabold tabular-nums ring-1 shadow-sm",
        out
          ? "bg-rose-100 text-rose-700 ring-rose-200"
          : low
            ? "bg-amber-100 text-amber-800 ring-amber-200 animate-pulse"
            : "bg-slate-100 text-slate-800 ring-slate-200",
      )}
    >
      <TimerIcon className="h-5 w-5" />
      {out ? "Time's up" : `${mm}:${String(ss).padStart(2, "0")}`}
    </span>
  )
}

function BlankInput({
  value,
  onChange,
  onKeyDown,
  result,
  correct,
  autoFocus,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  result: "idle" | "correct" | "incorrect"
  correct: boolean | undefined
  autoFocus?: boolean
  placeholder?: string
}) {
  const dynamicWidth = Math.max((value.length || 8) + 1, 10)
  const checked = result !== "idle" && typeof correct === "boolean"
  return (
    <input
      type="text"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      readOnly={result !== "idle"}
      placeholder={placeholder}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      style={{ width: `${dynamicWidth}ch` }}
      className={cn(
        "mx-1 inline-block bg-transparent border-0 border-b-2 px-1 py-0.5 text-center text-base tabular-nums focus:outline-none focus:ring-0",
        !checked && "border-blue-500 text-slate-900 caret-blue-500",
        checked && correct && "border-emerald-500 text-emerald-700 font-semibold caret-transparent",
        checked && !correct && "border-rose-500 text-rose-700 font-semibold line-through caret-transparent",
      )}
    />
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-slate-500" />
      <p className="mt-1 text-base font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

function MistakesReview({ mistakes, total }: { mistakes: ReviewItem[]; total: number }) {
  if (mistakes.length === 0) return null
  return (
    <Card className="mt-4">
      <CardContent className="pt-6 pb-6 space-y-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-slate-900">Review mistakes</h3>
          <span className="text-xs text-slate-500">
            {mistakes.length} of {total} question{total === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="space-y-2.5">
          {mistakes.map((a) => (
            <li key={a.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-start gap-2.5">
                <XCircle className="h-5 w-5 shrink-0 text-rose-500" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-slate-900 leading-snug">
                    Question {a.id}:{" "}
                    <span className="font-normal">&ldquo;{a.prompt}&rdquo;</span>
                  </p>
                  <p className="text-sm text-rose-600">
                    Your answer:{" "}
                    <span className="font-medium">&ldquo;{a.userAnswer || "—"}&rdquo;</span>
                  </p>
                  <p className="text-sm text-emerald-700">
                    Correct: <span className="font-medium">&ldquo;{a.correctAnswer}&rdquo;</span>
                  </p>
                  {a.explanation && (
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Why:</span> {a.explanation}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
