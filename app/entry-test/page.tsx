"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Lock,
  PenTool,
  Sparkles,
} from "lucide-react"
import {
  buildDemoMCAnswers,
  buildDemoReadingAnswers,
  DEMO_WRITING_TEXT,
  ENTRY_MC_QUESTIONS,
  ENTRY_READING_QUESTIONS,
  ENTRY_READING_TEXT,
  ENTRY_WRITING_PROMPT,
} from "@/lib/entry-test-content"
import type { EntryTestSubmission } from "@/lib/entry-test-storage"
import { entryTestApi } from "@/lib/api"
import { cn } from "@/lib/utils"

type View = "overview" | "mc" | "reading" | "writing"

export default function EntryTestPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [test, setTest] = useState<EntryTestSubmission | null>(null)
  const [view, setView] = useState<View>("overview")

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isLoading && !user) router.push("/login")
  }, [user, isLoading, router])

  const reload = useCallback(async () => {
    if (!user) return
    try {
      setTest(await entryTestApi.mine())
    } catch {
      setTest(null)
    }
  }, [user])

  useEffect(() => {
    if (user) reload()
  }, [user, reload])

  if (!mounted || isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">No entry test assigned</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your teacher hasn&apos;t assigned a placement test yet.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (view === "mc") {
    return <MCSection test={test} onExit={() => { reload(); setView("overview") }} />
  }
  if (view === "reading") {
    return <ReadingSection test={test} onExit={() => { reload(); setView("overview") }} />
  }
  if (view === "writing") {
    return <WritingSection test={test} onExit={() => { reload(); setView("overview") }} />
  }

  return <Overview test={test} onOpen={setView} />
}

function Header() {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Entry / Placement Test</h1>
          <p className="text-xs text-slate-500">Determine your English level</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
      </div>
    </div>
  )
}

function Overview({
  test,
  onOpen,
}: {
  test: EntryTestSubmission
  onOpen: (v: View) => void
}) {
  const mcAnswered = Object.keys(test.mcAnswers).length
  const readingAnswered = Object.keys(test.readingAnswers).length
  const allDone = test.mcCompleted && test.readingCompleted && test.writingSubmitted
  const graded = test.overallLevel != null

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {graded ? (
          <ResultsPanel test={test} />
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6">
              <h2 className="text-lg font-semibold text-slate-900">Three sections</h2>
              <p className="mt-1 text-sm text-slate-500">
                Complete each section to determine your level. You can stop and continue at any
                time — your progress is saved automatically.
              </p>
              {allDone && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  All sections submitted. Your teacher will review your writing and confirm your level.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <SectionCard
          icon={ListChecks}
          title="Grammar — Multiple Choice"
          subtitle={`${ENTRY_MC_QUESTIONS.length} questions · auto-scored`}
          done={test.mcCompleted}
          progressLabel={
            graded && test.mcLevel
              ? `${test.mcScore}/${ENTRY_MC_QUESTIONS.length} · ${test.mcLevel}`
              : test.mcCompleted
                ? "Completed"
                : mcAnswered > 0
                  ? `${mcAnswered}/${ENTRY_MC_QUESTIONS.length} answered`
                  : "Not started"
          }
          actionLabel={test.mcCompleted ? "Done" : mcAnswered > 0 ? "Continue" : "Start"}
          onClick={() => onOpen("mc")}
        />

        <SectionCard
          icon={BookOpen}
          title="Reading"
          subtitle={`${ENTRY_READING_QUESTIONS.length} questions · auto-scored`}
          done={test.readingCompleted}
          progressLabel={
            graded && test.readingLevel
              ? `${test.readingScore}/${ENTRY_READING_QUESTIONS.length} · ${test.readingLevel}`
              : test.readingCompleted
                ? "Completed"
                : readingAnswered > 0
                  ? `${readingAnswered}/${ENTRY_READING_QUESTIONS.length} answered`
                  : "Not started"
          }
          actionLabel={test.readingCompleted ? "Done" : readingAnswered > 0 ? "Continue" : "Start"}
          onClick={() => onOpen("reading")}
        />

        <SectionCard
          icon={PenTool}
          title="Writing"
          subtitle="Graded by your teacher"
          done={test.writingSubmitted}
          progressLabel={
            test.writingLevel != null
              ? `Reviewed · ${test.writingLevel}`
              : test.writingSubmitted
                ? "Submitted — awaiting review"
                : test.writingText.trim()
                  ? "Draft saved"
                  : "Not started"
          }
          actionLabel={test.writingSubmitted ? "View" : test.writingText.trim() ? "Continue" : "Start"}
          onClick={() => onOpen("writing")}
        />
      </div>
    </div>
  )
}

function ResultsPanel({ test }: { test: EntryTestSubmission }) {
  const rows = [
    {
      label: "Grammar (MC)",
      detail: test.mcCompleted ? `${test.mcScore}/${ENTRY_MC_QUESTIONS.length} correct` : "—",
      level: test.mcLevel,
    },
    {
      label: "Reading",
      detail: test.readingCompleted ? `${test.readingScore}/${ENTRY_READING_QUESTIONS.length} correct` : "—",
      level: test.readingLevel,
    },
    {
      label: "Writing",
      detail: "Graded by teacher",
      level: test.writingLevel,
    },
  ]

  return (
    <Card className="overflow-hidden border-emerald-200">
      <div className="flex items-center gap-2 bg-emerald-50 px-6 py-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <h2 className="text-lg font-semibold text-emerald-900">Your results are ready</h2>
          <p className="text-sm text-emerald-700">Your teacher has assessed your level.</p>
        </div>
      </div>
      <CardContent className="pt-5 pb-6 space-y-3">
        {test.overallLevel && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Your overall level
              </p>
              <p className="text-xs text-emerald-700/80">Final placement set by your teacher</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white">
              {test.overallLevel}
            </span>
          </div>
        )}

        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">{r.label}</p>
                <p className="text-xs text-slate-500">{r.detail}</p>
              </div>
              {r.level && (
                <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
                  {r.level}
                </span>
              )}
            </div>
          ))}
        </div>

        {test.writingFeedback && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Teacher&apos;s comment
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{test.writingFeedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  done,
  progressLabel,
  actionLabel,
  onClick,
}: {
  icon: typeof ListChecks
  title: string
  subtitle: string
  done: boolean
  progressLabel: string
  actionLabel: string
  onClick: () => void
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
          )}
        >
          {done ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-700">{progressLabel}</p>
        </div>
        <Button
          onClick={onClick}
          variant={done ? "outline" : "default"}
          className={cn(!done && "bg-[#C8102E] hover:bg-[#A00D25]")}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Multiple choice section ────────────────────────────────────────────────

function MCSection({ test, onExit }: { test: EntryTestSubmission; onExit: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>(test.mcAnswers)
  const [index, setIndex] = useState(() => {
    const firstUnanswered = ENTRY_MC_QUESTIONS.findIndex((q) => !test.mcAnswers[q.id])
    return firstUnanswered === -1 ? 0 : firstUnanswered
  })
  const [submitting, setSubmitting] = useState(false)
  const locked = test.mcCompleted

  const question = ENTRY_MC_QUESTIONS[index]
  const total = ENTRY_MC_QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === total

  const choose = (opt: string) => {
    if (locked) return
    const next = { ...answers, [question.id]: opt }
    setAnswers(next)
    void entryTestApi.saveMc(test.id, next, false).catch(() => {})
  }

  const finish = async () => {
    setSubmitting(true)
    try {
      await entryTestApi.saveMc(test.id, answers, true)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  const autofillDemo = async () => {
    const filled = buildDemoMCAnswers()
    setAnswers(filled)
    setSubmitting(true)
    try {
      await entryTestApi.saveMc(test.id, filled, true)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionShell
      title="Grammar — Multiple Choice"
      onExit={onExit}
      index={index}
      total={total}
      answeredCount={answeredCount}
      locked={locked}
      onDemoAutofill={autofillDemo}
      demoLoading={submitting}
    >
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-500">Question {index + 1} of {total}</h2>
          <p className="text-lg leading-relaxed text-slate-900">{question.text}</p>
          <div className="grid gap-2.5">
            {question.options.map((opt) => {
              const chosen = answers[question.id] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={locked}
                  onClick={() => choose(opt)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-base transition-all",
                    !locked && chosen && "border-blue-500 bg-blue-50 text-slate-900 ring-1 ring-blue-500",
                    !locked && !chosen && "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    locked && chosen && "border-slate-400 bg-slate-100 text-slate-900",
                    locked && !chosen && "border-slate-200 bg-white text-slate-400",
                  )}
                >
                  <span className="font-medium">{opt}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <NavRow
        index={index}
        total={total}
        onPrev={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={() => setIndex((i) => Math.min(total - 1, i + 1))}
        canFinish={!locked && allAnswered}
        onFinish={finish}
        finishing={submitting}
        locked={locked}
      />
    </SectionShell>
  )
}

// ─── Reading section ────────────────────────────────────────────────────────

function ReadingSection({ test, onExit }: { test: EntryTestSubmission; onExit: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number | boolean>>(test.readingAnswers)
  const [submitting, setSubmitting] = useState(false)
  const locked = test.readingCompleted
  const total = ENTRY_READING_QUESTIONS.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === total

  const choose = (qid: number, value: number | boolean) => {
    if (locked) return
    const next = { ...answers, [qid]: value }
    setAnswers(next)
    void entryTestApi.saveReading(test.id, next, false).catch(() => {})
  }

  const finish = async () => {
    setSubmitting(true)
    try {
      await entryTestApi.saveReading(test.id, answers, true)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  const autofillDemo = async () => {
    const filled = buildDemoReadingAnswers()
    setAnswers(filled)
    setSubmitting(true)
    try {
      await entryTestApi.saveReading(test.id, filled, true)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sections
            </button>
            <h1 className="text-lg font-bold text-slate-900">Reading</h1>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!locked && <DemoAutofillButton onClick={autofillDemo} loading={submitting} />}
            <span className="text-xs font-medium text-slate-500">
              {answeredCount}/{total} answered
            </span>
          </div>
        </div>
      </div>

      {/* Two-column body: text left (full height), questions right */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Text — full height, own scroll */}
        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-500">Read the text</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            <div className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
              {ENTRY_READING_TEXT}
            </div>
          </div>
        </div>

        {/* Questions — own scroll */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="space-y-3">
              {ENTRY_READING_QUESTIONS.map((q, qi) => (
                <Card key={q.id}>
                  <CardContent className="space-y-3 py-4">
                    <p className="text-sm font-medium text-slate-900">
                      {qi + 1}. {q.question}
                    </p>
                    {q.type === "multiple-choice" ? (
                      <div className="grid gap-2">
                        {(q.options ?? []).map((opt, oi) => {
                          const chosen = answers[q.id] === oi
                          return (
                            <button
                              key={oi}
                              type="button"
                              disabled={locked}
                              onClick={() => choose(q.id, oi)}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-left text-sm transition-all",
                                !locked && chosen && "border-blue-500 bg-blue-50 ring-1 ring-blue-500",
                                !locked && !chosen && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                locked && chosen && "border-slate-400 bg-slate-100 text-slate-900",
                                locked && !chosen && "border-slate-200 bg-white text-slate-400",
                              )}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {[
                          { label: "True", value: true },
                          { label: "False", value: false },
                        ].map((o) => {
                          const chosen = answers[q.id] === o.value
                          return (
                            <button
                              key={o.label}
                              type="button"
                              disabled={locked}
                              onClick={() => choose(q.id, o.value)}
                              className={cn(
                                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                                !locked && chosen && "border-blue-500 bg-blue-50 ring-1 ring-blue-500",
                                !locked && !chosen && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                locked && chosen && "border-slate-400 bg-slate-100 text-slate-900",
                                locked && !chosen && "border-slate-200 bg-white text-slate-400",
                              )}
                            >
                              {o.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {!locked && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <Button
                onClick={finish}
                loading={submitting}
                disabled={!allAnswered}
                className="w-full bg-[#C8102E] hover:bg-[#A00D25] disabled:opacity-50"
              >
                Submit reading ({answeredCount}/{total})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Writing section ────────────────────────────────────────────────────────

function WritingSection({ test, onExit }: { test: EntryTestSubmission; onExit: () => void }) {
  const [text, setText] = useState(test.writingText)
  const [submitting, setSubmitting] = useState(false)
  const locked = test.writingSubmitted
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  // Autosave the draft a moment after typing stops.
  useEffect(() => {
    if (locked) return
    const t = setTimeout(() => {
      void entryTestApi.saveWritingDraft(test.id, text).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [text, locked, test.id])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await entryTestApi.submitWriting(test.id, text)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  const autofillDemo = async () => {
    setText(DEMO_WRITING_TEXT)
    setSubmitting(true)
    try {
      await entryTestApi.submitWriting(test.id, DEMO_WRITING_TEXT)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionShell
      title="Writing"
      onExit={onExit}
      locked={locked}
      onDemoAutofill={autofillDemo}
      demoLoading={submitting}
    >
      <Card>
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {ENTRY_WRITING_PROMPT.title}
            </p>
            <p className="mt-1 text-sm text-slate-700">{ENTRY_WRITING_PROMPT.prompt}</p>
            <p className="mt-1 text-xs text-slate-500">
              Write at least {ENTRY_WRITING_PROMPT.minWords} words · ~{ENTRY_WRITING_PROMPT.estimatedMinutes} min
            </p>
          </div>

          {test.writingLevel != null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <p className="font-semibold text-emerald-800">
                Reviewed by your teacher · {test.writingLevel}
              </p>
              {test.writingFeedback && (
                <p className="mt-1 text-emerald-900">{test.writingFeedback}</p>
              )}
            </div>
          )}

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={locked}
            placeholder="Write your answer here…"
            className="min-h-[280px] resize-y text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{wordCount} words</span>
            {locked ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                Submitted — awaiting teacher review
              </span>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={wordCount < 10}
                className="bg-[#C8102E] hover:bg-[#A00D25] disabled:opacity-50"
              >
                Submit writing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </SectionShell>
  )
}

// ─── Shared shell ───────────────────────────────────────────────────────────

function DemoAutofillButton({
  onClick,
  loading = false,
}: {
  onClick: () => void
  loading?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      loading={loading}
      className="gap-1.5 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
    >
      <Sparkles className="h-3.5 w-3.5" />
      Autofill
      <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        Demo
      </span>
    </Button>
  )
}

function SectionShell({
  title,
  onExit,
  index,
  total,
  answeredCount,
  locked,
  onDemoAutofill,
  demoLoading = false,
  children,
}: {
  title: string
  onExit: () => void
  index?: number
  total?: number
  answeredCount?: number
  locked?: boolean
  onDemoAutofill?: () => void
  demoLoading?: boolean
  children: React.ReactNode
}) {
  const pct =
    total && total > 0
      ? Math.round(((answeredCount ?? 0) / total) * 100)
      : 0
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sections
            </button>
            <div className="flex items-center gap-2">
              {!locked && onDemoAutofill && (
                <DemoAutofillButton onClick={onDemoAutofill} loading={demoLoading} />
              )}
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
          {total != null && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#C8102E] transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">{children}</div>
    </div>
  )
}

function NavRow({
  index,
  total,
  onPrev,
  onNext,
  canFinish,
  onFinish,
  finishing = false,
  locked,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  canFinish: boolean
  onFinish: () => void
  finishing?: boolean
  locked?: boolean
}) {
  const isLast = index + 1 >= total
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" onClick={onPrev} disabled={index === 0} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Prev
      </Button>
      {isLast && !locked ? (
        <Button
          onClick={onFinish}
          loading={finishing}
          disabled={!canFinish}
          className="bg-[#C8102E] hover:bg-[#A00D25] disabled:opacity-50"
        >
          Submit section
        </Button>
      ) : (
        <Button onClick={onNext} disabled={isLast} className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
