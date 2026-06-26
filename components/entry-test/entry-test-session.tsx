"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
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
import type { EntryTestActions } from "@/lib/entry-test-actions"
import { cn } from "@/lib/utils"
import { EntryTestLangToggle, useEntryTestLang } from "@/components/entry-test/entry-test-lang"

type View = "overview" | "mc" | "reading" | "writing"

export interface EntryTestSessionProps {
  test: EntryTestSubmission
  actions: EntryTestActions
  onReload: () => Promise<void>
  backHref?: string
  backLabel?: string
  showDemoAutofill?: boolean
}

export function EntryTestSession({
  test,
  actions,
  onReload,
  backHref,
  backLabel,
  showDemoAutofill = false,
}: EntryTestSessionProps) {
  const { t } = useEntryTestLang()
  const resolvedBackLabel = backLabel ?? t("back")
  const [view, setView] = useState<View>("overview")

  const exitSection = () => {
    void onReload()
    setView("overview")
  }

  if (view === "mc") {
    return (
      <MCSection
        test={test}
        actions={actions}
        onExit={exitSection}
        showDemoAutofill={showDemoAutofill}
      />
    )
  }
  if (view === "reading") {
    return (
      <ReadingSection
        test={test}
        actions={actions}
        onExit={exitSection}
        showDemoAutofill={showDemoAutofill}
      />
    )
  }
  if (view === "writing") {
    return (
      <WritingSection
        test={test}
        actions={actions}
        onExit={exitSection}
        showDemoAutofill={showDemoAutofill}
      />
    )
  }

  return (
    <Overview
      test={test}
      actions={actions}
      onReload={onReload}
      onOpen={setView}
      backHref={backHref}
      backLabel={resolvedBackLabel}
      showDemoAutofill={showDemoAutofill}
    />
  )
}

function Header({ backHref, backLabel }: { backHref?: string; backLabel?: string }) {
  const { t } = useEntryTestLang()
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("headerTitle")}</h1>
          <p className="text-xs text-slate-500">{t("headerSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <EntryTestLangToggle />
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Overview({
  test,
  actions,
  onReload,
  onOpen,
  backHref,
  backLabel,
  showDemoAutofill,
}: {
  test: EntryTestSubmission
  actions: EntryTestActions
  onReload: () => Promise<void>
  onOpen: (v: View) => void
  backHref?: string
  backLabel?: string
  showDemoAutofill: boolean
}) {
  const { t } = useEntryTestLang()
  const [autofillingAll, setAutofillingAll] = useState(false)
  const mcAnswered = Object.keys(test.mcAnswers).length
  const readingAnswered = Object.keys(test.readingAnswers).length
  const allDone = test.mcCompleted && test.readingCompleted && test.writingSubmitted
  const graded = test.overallLevel != null
  const canAutofillAll = showDemoAutofill && !graded && !allDone

  const autofillAll = async () => {
    setAutofillingAll(true)
    try {
      if (!test.mcCompleted) {
        await actions.saveMc(test.id, buildDemoMCAnswers(), true)
      }
      if (!test.readingCompleted) {
        await actions.saveReading(test.id, buildDemoReadingAnswers(), true)
      }
      if (!test.writingSubmitted) {
        await actions.submitWriting(test.id, DEMO_WRITING_TEXT)
      }
      await onReload()
    } finally {
      setAutofillingAll(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header backHref={backHref} backLabel={backLabel} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {graded ? (
          <ResultsPanel test={test} />
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t("threeSections")}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t("overviewDesc")}</p>
                </div>
                {canAutofillAll && (
                  <DemoAutofillButton
                    onClick={autofillAll}
                    loading={autofillingAll}
                    label={t("autofillAll")}
                  />
                )}
              </div>
              {allDone && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("allSubmitted")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <SectionCard
          icon={ListChecks}
          title={t("grammarTitle")}
          subtitle={t("questionsAutoScored", { count: ENTRY_MC_QUESTIONS.length })}
          done={test.mcCompleted}
          progressLabel={
            graded && test.mcLevel
              ? t("scoreLevel", {
                  score: test.mcScore ?? 0,
                  total: ENTRY_MC_QUESTIONS.length,
                  level: test.mcLevel,
                })
              : test.mcCompleted
                ? t("completed")
                : mcAnswered > 0
                  ? t("answered", { count: mcAnswered, total: ENTRY_MC_QUESTIONS.length })
                  : t("notStarted")
          }
          actionLabel={
            test.mcCompleted ? t("done") : mcAnswered > 0 ? t("continueAction") : t("start")
          }
          onClick={() => onOpen("mc")}
        />

        <SectionCard
          icon={BookOpen}
          title={t("readingTitle")}
          subtitle={t("questionsAutoScored", { count: ENTRY_READING_QUESTIONS.length })}
          done={test.readingCompleted}
          progressLabel={
            graded && test.readingLevel
              ? t("scoreLevel", {
                  score: test.readingScore ?? 0,
                  total: ENTRY_READING_QUESTIONS.length,
                  level: test.readingLevel,
                })
              : test.readingCompleted
                ? t("completed")
                : readingAnswered > 0
                  ? t("answered", { count: readingAnswered, total: ENTRY_READING_QUESTIONS.length })
                  : t("notStarted")
          }
          actionLabel={
            test.readingCompleted
              ? t("done")
              : readingAnswered > 0
                ? t("continueAction")
                : t("start")
          }
          onClick={() => onOpen("reading")}
        />

        <SectionCard
          icon={PenTool}
          title={t("writingTitle")}
          subtitle={t("gradedByTeacher")}
          done={test.writingSubmitted}
          progressLabel={
            test.writingLevel != null
              ? t("reviewedLevel", { level: test.writingLevel })
              : test.writingSubmitted
                ? t("submittedAwaiting")
                : test.writingText.trim()
                  ? t("draftSaved")
                  : t("notStarted")
          }
          actionLabel={
            test.writingSubmitted
              ? t("view")
              : test.writingText.trim()
                ? t("continueAction")
                : t("start")
          }
          onClick={() => onOpen("writing")}
        />
      </div>
    </div>
  )
}

function ResultsPanel({ test }: { test: EntryTestSubmission }) {
  const { t } = useEntryTestLang()
  const rows = [
    {
      label: t("grammarMc"),
      detail: test.mcCompleted
        ? t("correctCount", { score: test.mcScore ?? 0, total: ENTRY_MC_QUESTIONS.length })
        : "—",
      level: test.mcLevel,
    },
    {
      label: t("readingTitle"),
      detail: test.readingCompleted
        ? t("correctCount", { score: test.readingScore ?? 0, total: ENTRY_READING_QUESTIONS.length })
        : "—",
      level: test.readingLevel,
    },
    {
      label: t("writingTitle"),
      detail: t("gradedByTeacherShort"),
      level: test.writingLevel,
    },
  ]

  return (
    <Card className="overflow-hidden border-emerald-200">
      <div className="flex items-center gap-2 bg-emerald-50 px-6 py-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <h2 className="text-lg font-semibold text-emerald-900">{t("resultsReady")}</h2>
          <p className="text-sm text-emerald-700">{t("teacherAssessed")}</p>
        </div>
      </div>
      <CardContent className="pt-5 pb-6 space-y-3">
        {test.overallLevel && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                {t("overallLevel")}
              </p>
              <p className="text-xs text-emerald-700/80">{t("finalPlacement")}</p>
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
              {t("teacherComment")}
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
          className={cn(!done && "bg-primary hover:bg-primary/90")}
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Multiple choice section ────────────────────────────────────────────────

function MCSection({
  test,
  actions,
  onExit,
  showDemoAutofill,
}: {
  test: EntryTestSubmission
  actions: EntryTestActions
  onExit: () => void
  showDemoAutofill: boolean
}) {
  const { t } = useEntryTestLang()
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
    void actions.saveMc(test.id, next, false).catch(() => {})
  }

  const finish = async () => {
    setSubmitting(true)
    try {
      await actions.saveMc(test.id, answers, true)
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
      await actions.saveMc(test.id, filled, true)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionShell
      title={t("grammarTitle")}
      onExit={onExit}
      index={index}
      total={total}
      answeredCount={answeredCount}
      locked={locked}
      onDemoAutofill={showDemoAutofill ? autofillDemo : undefined}
      demoLoading={submitting}
    >
      <Card className="overflow-hidden">
        <CardContent className="pt-6 pb-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-500">
            {t("questionOf", { current: index + 1, total })}
          </h2>
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

function ReadingSection({
  test,
  actions,
  onExit,
  showDemoAutofill,
}: {
  test: EntryTestSubmission
  actions: EntryTestActions
  onExit: () => void
  showDemoAutofill: boolean
}) {
  const { t } = useEntryTestLang()
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
    void actions.saveReading(test.id, next, false).catch(() => {})
  }

  const finish = async () => {
    setSubmitting(true)
    try {
      await actions.saveReading(test.id, answers, true)
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
      await actions.saveReading(test.id, filled, true)
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
              {t("backToSections")}
            </button>
            <h1 className="text-lg font-bold text-slate-900">{t("readingTitle")}</h1>
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" />
                {t("completed")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!locked && showDemoAutofill && (
              <DemoAutofillButton onClick={autofillDemo} loading={submitting} />
            )}
            <EntryTestLangToggle />
            <span className="text-xs font-medium text-slate-500">
              {t("answered", { count: answeredCount, total })}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column body: text left (full height), questions right */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Text — full height, own scroll */}
        <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-500">{t("readTheText")}</h2>
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
                          { label: t("true"), value: true },
                          { label: t("false"), value: false },
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
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {t("submitReading", { count: answeredCount, total })}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Writing section ────────────────────────────────────────────────────────

function WritingSection({
  test,
  actions,
  onExit,
  showDemoAutofill,
}: {
  test: EntryTestSubmission
  actions: EntryTestActions
  onExit: () => void
  showDemoAutofill: boolean
}) {
  const { t } = useEntryTestLang()
  const [text, setText] = useState(test.writingText)
  const [submitting, setSubmitting] = useState(false)
  const locked = test.writingSubmitted
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  // Autosave the draft a moment after typing stops.
  useEffect(() => {
    if (locked) return
    const t = setTimeout(() => {
      void actions.saveWritingDraft(test.id, text).catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [text, locked, test.id])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await actions.submitWriting(test.id, text)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  const autofillDemo = async () => {
    setText(DEMO_WRITING_TEXT)
    setSubmitting(true)
    try {
      await actions.submitWriting(test.id, DEMO_WRITING_TEXT)
      onExit()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionShell
      title={t("writingTitle")}
      onExit={onExit}
      locked={locked}
      onDemoAutofill={showDemoAutofill ? autofillDemo : undefined}
      demoLoading={submitting}
    >
      <Card>
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {t("writingTaskLabel")}
            </p>
            <p className="mt-1 text-sm text-slate-700">{ENTRY_WRITING_PROMPT.prompt}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t("minWordsHint", {
                min: ENTRY_WRITING_PROMPT.minWords,
                minutes: ENTRY_WRITING_PROMPT.estimatedMinutes,
              })}
            </p>
          </div>

          {test.writingLevel != null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <p className="font-semibold text-emerald-800">
                {t("reviewedByTeacher", { level: test.writingLevel })}
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
            placeholder={t("writePlaceholder")}
            className="min-h-[280px] resize-y text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{t("wordCount", { count: wordCount })}</span>
            {locked ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Lock className="h-3.5 w-3.5" />
                {t("submittedAwaitingReview")}
              </span>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={wordCount < 10}
                className="bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {t("submitWriting")}
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
  label,
}: {
  onClick: () => void
  loading?: boolean
  label?: string
}) {
  const { t } = useEntryTestLang()
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
      {label ?? t("autofill")}
      <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
        {t("demo")}
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
  const { t } = useEntryTestLang()
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
              {t("backToSections")}
            </button>
            <div className="flex items-center gap-2">
              {!locked && onDemoAutofill && (
                <DemoAutofillButton onClick={onDemoAutofill} loading={demoLoading} />
              )}
              <EntryTestLangToggle />
              {locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("completed")}
                </span>
              )}
            </div>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
          {total != null && (
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
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
  const { t } = useEntryTestLang()
  const isLast = index + 1 >= total
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="outline" onClick={onPrev} disabled={index === 0} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        {t("prev")}
      </Button>
      {isLast && !locked ? (
        <Button
          onClick={onFinish}
          loading={finishing}
          disabled={!canFinish}
          className="bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {t("submitSection")}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={isLast} className="gap-1.5 bg-blue-500 hover:bg-blue-600 text-white">
          {t("next")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
