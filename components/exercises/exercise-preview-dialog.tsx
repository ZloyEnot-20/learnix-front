"use client"

import { Fragment } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, Clock, ListChecks, Lightbulb, BookOpen } from "lucide-react"
import {
  GRAMMAR_BLANK_TOKEN,
  type GrammarExercise,
} from "@/lib/grammar-types"
import { cn } from "@/lib/utils"

const LEVEL_PALETTE: Record<string, string> = {
  A1: "bg-emerald-100 text-emerald-700 ring-emerald-200/70",
  A2: "bg-lime-100 text-lime-800 ring-lime-200/70",
  B1: "bg-sky-100 text-sky-700 ring-sky-200/70",
  B2: "bg-amber-100 text-amber-800 ring-amber-200/70",
  C1: "bg-rose-100 text-rose-700 ring-rose-200/70",
  C2: "bg-purple-100 text-purple-700 ring-purple-200/70",
}

const DIFFICULTY_META: Record<GrammarExercise["difficulty"], { label: string; cls: string }> = {
  easy: { label: "Easy", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200/60" },
  medium: { label: "Medium", cls: "bg-amber-50 text-amber-800 ring-amber-200/60" },
  hard: { label: "Hard", cls: "bg-rose-50 text-rose-700 ring-rose-200/60" },
}

function levelBadgeClass(level: string): string {
  const key = level.split(/[-–]/)[0].trim().toUpperCase()
  return LEVEL_PALETTE[key] ?? "bg-slate-100 text-slate-700 ring-slate-200/70"
}

interface Props {
  exercise: GrammarExercise | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ExercisePreviewDialog({ exercise, open, onOpenChange }: Props) {
  if (!exercise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exercise preview</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const diff = DIFFICULTY_META[exercise.difficulty]
  const levelCls = levelBadgeClass(exercise.level)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1",
                levelCls,
              )}
            >
              {exercise.level}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                diff.cls,
              )}
            >
              {diff.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <ListChecks className="h-3 w-3" />
              {exercise.totalQuestions} questions
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" />
              {exercise.estimatedTime} min
            </span>
          </div>
          <DialogTitle className="text-xl mt-2 text-left">{exercise.title}</DialogTitle>
          <DialogDescription className="text-left">
            {exercise.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {exercise.instructions && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  Instructions
                </p>
                <p className="mt-1 text-sm text-slate-700">{exercise.instructions}</p>
              </div>
            )}

            {exercise.tips && exercise.tips.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                  Tips
                </p>
                <ul className="mt-1.5 space-y-1">
                  {exercise.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-700 leading-relaxed">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {exercise.content.pairs && exercise.content.pairs.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Pairs ({exercise.content.pairs.length})
                </h3>
                <ul className="space-y-2">
                  {exercise.content.pairs.map((pair, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{pair.left}</span>
                      <span className="text-slate-300">→</span>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                        <CheckCircle2 className="h-3 w-3" />
                        {pair.right}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Questions ({(exercise.content.questions ?? []).length})
              </h3>

              <ol className="space-y-3">
                {(exercise.content.questions ?? []).map((q, idx) => (
                  <li
                    key={q.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <p className="text-sm leading-relaxed text-slate-900">
                          {q.options && q.options.length > 0
                            ? q.text.replace(GRAMMAR_BLANK_TOKEN, "_____")
                            : renderQuestionText(q.text, q.acceptableAnswers, q.blanks)}
                        </p>

                        {q.options && q.options.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {q.options.map((opt) => {
                              const isCorrect = opt === q.correctAnswer
                              return (
                                <span
                                  key={opt}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1",
                                    isCorrect
                                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200/60"
                                      : "bg-slate-50 text-slate-600 ring-slate-200/60",
                                  )}
                                >
                                  {isCorrect && <CheckCircle2 className="h-3 w-3" />}
                                  {opt}
                                </span>
                              )
                            })}
                          </div>
                        ) : q.correctBool !== undefined ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                              <CheckCircle2 className="h-3 w-3" />
                              {q.correctBool ? "True / Correct" : "False / Incorrect"}
                            </span>
                          </div>
                        ) : q.answer ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Answer
                            </span>
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                              {q.answer}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Answer
                            </span>
                            {(q.acceptableAnswers ?? []).map((variants, blankIdx) => (
                              <Fragment key={blankIdx}>
                                {variants.map((variant, vIdx) => (
                                  <span
                                    key={`${blankIdx}-${vIdx}`}
                                    className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60"
                                  >
                                    {variant}
                                  </span>
                                ))}
                                {blankIdx < (q.acceptableAnswers ?? []).length - 1 && (
                                  <span className="text-slate-300">·</span>
                                )}
                              </Fragment>
                            ))}
                          </div>
                        )}

                        {q.hint && (
                          <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 px-2.5 py-1.5">
                            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                            <p className="text-xs text-slate-700 leading-relaxed">
                              <span className="font-semibold text-amber-800">Hint:</span>{" "}
                              {q.hint}
                            </p>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="flex items-start gap-2 rounded-lg bg-blue-50/60 px-2.5 py-1.5">
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />
                            <p className="text-xs text-slate-700 leading-relaxed">
                              <span className="font-semibold text-blue-800">Why:</span>{" "}
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Replaces `_____` placeholders inside the question text with highlighted
 * blanks showing the canonical answer (or first acceptable answer).
 */
function renderQuestionText(
  text: string,
  acceptableAnswers?: string[][],
  blanks?: string[],
): React.ReactNode {
  const parts = text.split(GRAMMAR_BLANK_TOKEN)
  if (parts.length === 1) return text
  const out: React.ReactNode[] = []
  parts.forEach((part, idx) => {
    out.push(<Fragment key={`p${idx}`}>{part}</Fragment>)
    if (idx < parts.length - 1) {
      const answer =
        acceptableAnswers?.[idx]?.[0] ?? blanks?.[idx] ?? GRAMMAR_BLANK_TOKEN
      out.push(
        <span
          key={`b${idx}`}
          className="mx-0.5 inline-block rounded-md border-b-2 border-emerald-500 bg-emerald-50 px-1.5 py-0.5 text-sm font-semibold text-emerald-800"
        >
          {answer}
        </span>,
      )
    }
  })
  return out
}
