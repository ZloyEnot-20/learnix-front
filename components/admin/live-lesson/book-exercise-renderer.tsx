"use client"

import type { ReactNode } from "react"
import type { BookExerciseRaw, BookExerciseUiType, LessonStep } from "@/lib/books/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function TeacherAnswers({ answers }: { answers?: unknown }) {
  if (answers == null) return null
  return (
    <details className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <summary className="cursor-pointer text-sm font-medium text-amber-900">
        Teacher answers (answer key)
      </summary>
      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-amber-950">
        {typeof answers === "string" ? answers : JSON.stringify(answers, null, 2)}
      </pre>
    </details>
  )
}

function Instruction({ text }: { text: string }) {
  if (!text) return null
  return <p className="text-base leading-relaxed text-slate-700">{text}</p>
}

function ChipList({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <span
          key={item}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function VocabChecklist({ raw }: { raw: BookExerciseRaw }) {
  return <ChipList items={asStringArray(raw.items)} className="mt-4" />
}

function VocabTable({ raw }: { raw: BookExerciseRaw }) {
  const table = isRecord(raw.table) ? raw.table : {}
  const bank = asStringArray(raw.items)
  return (
    <div className="mt-4 space-y-4">
      {bank.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Word box</p>
          <ChipList items={bank} />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(table).map(([col, vals]) => (
          <div key={col} className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">{col}</h4>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {asStringArray(vals).map((v) => (
                <li key={v} className="rounded-md bg-slate-50 px-2 py-1">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrefixChoice({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = isRecord(raw.answers) ? raw.answers : {}
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={items} />
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(answers).map(([prefix, vals]) => (
          <div key={prefix} className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-2 font-semibold text-sky-800">{prefix}</h4>
            <ChipList items={asStringArray(vals)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function WordFormation({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = asStringArray(raw.answers)
  return (
    <div className="mt-4 space-y-3">
      {items.map((item, i) => (
        <div
          key={item}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
        >
          <span className="font-medium text-slate-900">{item}</span>
          <span className="text-slate-400">→</span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-800">
            {answers[i] ?? "—"}
          </span>
        </div>
      ))}
    </div>
  )
}

function FillBlankSentences({ raw }: { raw: BookExerciseRaw }) {
  const items = Array.isArray(raw.items) ? raw.items : []
  return (
    <ol className="mt-4 space-y-3">
      {items.map((it, idx) => {
        if (!isRecord(it)) return null
        return (
          <li key={idx} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm leading-relaxed text-slate-800">
              <span className="mr-2 font-semibold text-slate-500">{idx + 1}.</span>
              {String(it.sentence ?? "")}
            </p>
            {"answer" in it && (
              <p className="mt-2 text-sm text-emerald-700">
                Answer: <span className="font-medium">{String(it.answer)}</span>
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Classification({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = isRecord(raw.answers) ? raw.answers : {}
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={items} />
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(answers).map(([bucket, vals]) => (
          <div key={bucket} className="rounded-xl border border-slate-200 p-4">
            <h4 className="mb-2 text-sm font-semibold capitalize text-slate-900">{bucket}</h4>
            <ChipList items={asStringArray(vals)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadingTfng({ raw }: { raw: BookExerciseRaw }) {
  const questions = Array.isArray(raw.questions) ? raw.questions : []
  const options = Array.isArray(raw.options) ? raw.options : []
  return (
    <div className="mt-4 space-y-4">
      {typeof raw.title === "string" && (
        <h4 className="text-center text-base font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4">
          {raw.title}
        </h4>
      )}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
        {String(raw.passage ?? "")}
      </div>
      {options.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">
            Options
          </p>
          <ul className="space-y-1 text-sm text-slate-800">
            {options.map((opt, i) => {
              if (!isRecord(opt)) return null
              return (
                <li key={i}>
                  <span className="font-bold text-violet-800">{String(opt.letter)} </span>
                  {String(opt.text ?? opt.name ?? "")}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {typeof raw.test_tip === "string" && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {raw.test_tip}
        </p>
      )}
      {questions.length > 0 ? (
        <ol className="space-y-3">
          {questions.map((q) => {
            if (!isRecord(q)) return null
            return (
              <li key={String(q.number)} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm text-slate-800">
                    <span className="mr-2 font-semibold">{String(q.number)}.</span>
                    {String(q.statement ?? "")}
                  </p>
                  <Badge variant="secondary">{String(q.answer ?? "")}</Badge>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}
    </div>
  )
}

function ParaphrasePairs({ raw }: { raw: BookExerciseRaw }) {
  const rows = Array.isArray(raw.paraphrases)
    ? raw.paraphrases
    : Array.isArray(raw.items)
      ? raw.items
      : []
  return (
    <div className="mt-4 space-y-2">
      {rows.map((row, i) => {
        if (!isRecord(row)) return null
        return (
          <div
            key={i}
            className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2"
          >
            <div className="text-sm text-slate-600">{String(row.original ?? "")}</div>
            <div className="text-sm font-medium text-sky-900">
              {String(row.paraphrase ?? row.answer ?? "")}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListeningNotes({ raw }: { raw: BookExerciseRaw }) {
  const notes = isRecord(raw.notes) ? raw.notes : {}
  const body = asStringArray(notes.body)
  const answers = asStringArray(raw.answers)
  return (
    <div className="mt-4 space-y-4">
      {raw.audio_track != null && (
        <Badge variant="outline">Audio track {String(raw.audio_track)}</Badge>
      )}
      {typeof raw.test_tip === "string" && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          {raw.test_tip}
        </p>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {typeof notes.title === "string" && (
          <h4 className="mb-3 font-semibold text-slate-900">{notes.title}</h4>
        )}
        <ul className="space-y-2 text-sm leading-relaxed text-slate-800">
          {body.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
      {answers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-slate-500">Answers 1–{answers.length}</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {answers.map((a, i) => (
              <li key={i} className="text-sm text-emerald-800">
                {i + 1}. {a}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function DiscussionQuestions({ raw }: { raw: BookExerciseRaw }) {
  const questions = asStringArray(raw.questions)
  return (
    <ol className="mt-4 space-y-3">
      {questions.map((q, i) => (
        <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
          <span className="mr-2 font-semibold text-slate-500">{i + 1}.</span>
          {q}
        </li>
      ))}
    </ol>
  )
}

function ListeningStructured({ raw }: { raw: BookExerciseRaw }) {
  const items = Array.isArray(raw.items) ? raw.items : []
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && (
        <Badge variant="outline">Audio track {String(raw.audio_track)}</Badge>
      )}
      {items.map((it, i) => {
        if (!isRecord(it)) return null
        return (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-medium text-slate-900">Speaker {String(it.speaker)}</p>
            <p className="mt-1 text-slate-600">Person: {String(it.person ?? "—")}</p>
            <ChipList items={asStringArray(it.adjectives)} className="mt-2" />
          </div>
        )
      })}
    </div>
  )
}

function ListeningMatch({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && (
        <Badge variant="outline">Audio track {String(raw.audio_track)}</Badge>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-medium">Speaker 1</p>
          <p className="mt-1 text-slate-700">{String(raw.speaker_1 ?? "—")}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 text-sm">
          <p className="font-medium">Speaker 2</p>
          <p className="mt-1 text-slate-700">{String(raw.speaker_2 ?? "—")}</p>
        </div>
      </div>
    </div>
  )
}

function ExpressionNotes({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="mb-2 text-sm font-semibold">Speaker 1</h4>
        <ChipList items={asStringArray(raw.speaker_1_expressions)} />
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="mb-2 text-sm font-semibold">Speaker 2</h4>
        <ChipList items={asStringArray(raw.speaker_2_expressions)} />
      </div>
    </div>
  )
}

function SummaryCompletion({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && (
        <Badge variant="outline">Audio track {String(raw.audio_track)}</Badge>
      )}
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
        {String(raw.summary ?? "")}
      </p>
      <ChipList items={asStringArray(raw.answers)} />
    </div>
  )
}

function SentenceWordbox({ raw }: { raw: BookExerciseRaw }) {
  const adjectives = asStringArray(raw.adjectives)
  const words = asStringArray(raw.words)
  const bank = adjectives.length ? adjectives : words
  const sentences = Array.isArray(raw.sentences) ? raw.sentences : []
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={bank} />
      <ol className="space-y-3">
        {sentences.map((s, i) => {
          if (!isRecord(s)) return null
          return (
            <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p>{String(s.sentence ?? "")}</p>
              {"answer" in s && (
                <p className="mt-2 text-emerald-700">Answer: {String(s.answer)}</p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function GapFillPassage({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={asStringArray(raw.words)} />
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap">
        {String(raw.text ?? "")}
      </p>
      <ol className="grid gap-1 sm:grid-cols-2">
        {asStringArray(raw.answers).map((a, i) => (
          <li key={i} className="text-sm text-emerald-800">
            {i + 1}. {a}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ImagePrompt({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-700">Image / mind map</p>
      {typeof raw.image_description === "string" && (
        <p className="mt-2 text-sm text-slate-500">{raw.image_description}</p>
      )}
    </div>
  )
}

function GraphTask({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-700">Graph task</p>
      <p className="mt-2 text-sm text-slate-500">
        Use the book graph while students complete the prompts.
      </p>
      {Array.isArray(raw.answers) && <ChipList items={asStringArray(raw.answers)} className="mt-4 justify-center" />}
    </div>
  )
}

function SpeakingTopic({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-5">
      <p className="text-sm font-medium text-violet-900">Speaking topic</p>
      <p className="mt-2 text-sm leading-relaxed text-violet-950">{String(raw.topic ?? "")}</p>
    </div>
  )
}

function AnswerList({ raw }: { raw: BookExerciseRaw }) {
  return <ChipList items={asStringArray(raw.answers)} className="mt-4" />
}

function InstructionOnly() {
  return (
    <p className="mt-4 text-sm text-slate-500">
      Follow the instruction with the class. No additional item bank in the book JSON.
    </p>
  )
}

const RENDERERS: Record<BookExerciseUiType, (props: { raw: BookExerciseRaw }) => ReactNode> = {
  "vocab-checklist": VocabChecklist,
  "listening-structured": ListeningStructured,
  "vocab-table": VocabTable,
  "prefix-choice": PrefixChoice,
  "word-formation": WordFormation,
  "image-prompt": ImagePrompt,
  "fill-blank-sentences": FillBlankSentences,
  "speaking-topic": SpeakingTopic,
  "instruction-only": () => <InstructionOnly />,
  "reading-tfng": ReadingTfng,
  "paraphrase-pairs": ParaphrasePairs,
  "listening-notes": ListeningNotes,
  "discussion-questions": DiscussionQuestions,
  "listening-match": ListeningMatch,
  "expression-notes": ExpressionNotes,
  classification: Classification,
  "summary-completion": SummaryCompletion,
  "sentence-wordbox": SentenceWordbox,
  "graph-task": GraphTask,
  "answer-list": AnswerList,
  "gap-fill-passage": GapFillPassage,
}

export function BookExerciseRenderer({
  step,
  className,
  showAnswers = true,
  variant = "admin",
}: {
  step: LessonStep
  className?: string
  /** Teachers see answer key; students must not. */
  showAnswers?: boolean
  /** `cambridge` matches mobile/book page chrome. */
  variant?: "admin" | "cambridge"
}) {
  const Renderer = RENDERERS[step.uiType] ?? (() => <InstructionOnly />)
  const raw = showAnswers ? step.raw : stripClientAnswers(step.raw)

  if (variant === "cambridge") {
    const exLabel =
      step.exerciseId === "test_practice"
        ? step.sectionLabel
        : /^\d/.test(String(step.exerciseId))
          ? String(step.exerciseId)
          : step.exerciseId
    return (
      <div
        className={cn(
          "mb-6 border-b pb-5 last:mb-0 last:border-b-0 last:pb-0",
          className,
        )}
        style={{ borderColor: "#C4A8E0" }}
      >
        <div className="mb-2 flex items-start gap-2">
          <span
            className="mt-0.5 inline-flex min-w-8 shrink-0 items-center justify-center rounded-sm px-1.5 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: "#6B3FA0" }}
          >
            {exLabel}
          </span>
          <p className="font-serif text-[15px] leading-relaxed text-[#2B1B45]">
            {step.instruction}
          </p>
        </div>
        <div className="cambridge-exercise pl-0 sm:pl-10">
          <Renderer raw={raw} />
        </div>
        {showAnswers && <TeacherAnswers answers={step.answers ?? step.raw.answers} />}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{step.uiLabel}</Badge>
        <Badge variant="outline">{step.sectionLabel}</Badge>
        <span className="text-xs text-slate-500">Exercise {step.exerciseId}</span>
      </div>
      <Instruction text={step.instruction} />
      <Renderer raw={raw} />
      {showAnswers && <TeacherAnswers answers={step.answers ?? step.raw.answers} />}
    </div>
  )
}

function stripClientAnswers(raw: BookExerciseRaw): BookExerciseRaw {
  const clone = structuredClone(raw)
  delete clone.answers
  delete clone.answer
  if (Array.isArray(clone.questions)) {
    clone.questions = clone.questions.map((q) => {
      if (q && typeof q === "object" && !Array.isArray(q)) {
        const { answer: _a, ...rest } = q as Record<string, unknown>
        return rest
      }
      return q
    })
  }
  if (Array.isArray(clone.items)) {
    clone.items = clone.items.map((it) => {
      if (it && typeof it === "object" && !Array.isArray(it)) {
        const next = { ...(it as Record<string, unknown>) }
        delete next.answer
        delete next.person
        delete next.adjectives
        delete next.paraphrase
        return next
      }
      return it
    })
  }
  if (Array.isArray(clone.sentences)) {
    clone.sentences = clone.sentences.map((s) => {
      if (s && typeof s === "object") {
        const next = { ...(s as Record<string, unknown>) }
        delete next.answer
        return next
      }
      return s
    })
  }
  return clone
}
