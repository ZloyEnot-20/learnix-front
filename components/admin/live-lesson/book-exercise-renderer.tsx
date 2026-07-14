"use client"

import { createContext, useContext, type CSSProperties, type ReactNode } from "react"
import type { BookExerciseRaw, BookExerciseUiType, LessonStep } from "@/lib/books/types"
import { TEXTBOOK } from "@/lib/books/textbook-theme"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const TextbookMode = createContext(false)
function useTB() {
  return useContext(TextbookMode)
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function TeacherAnswers({ answers }: { answers?: unknown }) {
  const tb = useTB()
  if (answers == null) return null
  return (
    <details
      className="mt-4 rounded p-3"
      style={
        tb
          ? {
              backgroundColor: TEXTBOOK.tipSoft,
              borderLeft: `4px solid ${TEXTBOOK.tip}`,
            }
          : undefined
      }
    >
      <summary
        className={cn(
          "cursor-pointer text-sm font-medium",
          !tb && "text-amber-900",
        )}
        style={tb ? { color: TEXTBOOK.tipText } : undefined}
      >
        Teacher answers (answer key)
      </summary>
      <pre
        className={cn(
          "mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs",
          !tb && "text-amber-950",
        )}
        style={tb ? { color: TEXTBOOK.text } : undefined}
      >
        {typeof answers === "string" ? answers : JSON.stringify(answers, null, 2)}
      </pre>
    </details>
  )
}

function Instruction({ text }: { text: string }) {
  const tb = useTB()
  if (!text) return null
  return (
    <p
      className={cn(!tb && "text-base leading-relaxed text-slate-700")}
      style={tb ? { fontSize: 15, lineHeight: 1.6, color: TEXTBOOK.text } : undefined}
    >
      {text}
    </p>
  )
}

type ChipTone = "list" | "vocab" | "collocation" | "phrase" | "speaking" | "default"

function ChipList({
  items,
  className,
  tone = "list",
}: {
  items: string[]
  className?: string
  tone?: ChipTone
}) {
  const tb = useTB()
  if (!tb) {
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

  const toneStyle: Record<ChipTone, CSSProperties> = {
    list: {
      backgroundColor: TEXTBOOK.content,
      border: `1px solid ${TEXTBOOK.border}`,
      color: TEXTBOOK.text,
      padding: "4px 12px",
      borderRadius: 4,
    },
    vocab: {
      backgroundColor: TEXTBOOK.correctSoft,
      color: TEXTBOOK.correctDeep,
      fontStyle: "italic",
      padding: "4px 16px",
      borderRadius: 4,
    },
    collocation: {
      backgroundColor: TEXTBOOK.orangeSoft,
      color: TEXTBOOK.orange,
      padding: "4px 14px",
      borderRadius: 4,
    },
    phrase: {
      backgroundColor: TEXTBOOK.accentWash,
      color: TEXTBOOK.accentDeep,
      fontStyle: "italic",
      fontWeight: 600,
      padding: "4px 16px",
      borderRadius: 4,
    },
    speaking: {
      backgroundColor: TEXTBOOK.tipSoft,
      color: TEXTBOOK.tipText,
      fontStyle: "italic",
      border: `1px solid ${TEXTBOOK.tipBorder}`,
      padding: "6px 16px",
      borderRadius: 4,
    },
    default: {
      backgroundColor: TEXTBOOK.mutedSoft,
      color: TEXTBOOK.muted,
      padding: "4px 12px",
      borderRadius: 4,
    },
  }

  return (
    <div
      className={cn("flex flex-wrap", className)}
      style={{ gap: "8px 20px" }}
    >
      {items.map((item) => (
        <span key={item} className="text-[14px]" style={toneStyle[tone]}>
          {item}
        </span>
      ))}
    </div>
  )
}

function AudioMark({ track }: { track: string | number }) {
  const tb = useTB()
  return (
    <span
      className={cn("text-sm", !tb && "rounded-full border px-2 py-0.5")}
      style={
        tb
          ? { color: TEXTBOOK.audio, fontWeight: 600 }
          : undefined
      }
    >
      ♪ Audio {String(track)}
    </span>
  )
}

function BlankRow({ children }: { children: ReactNode }) {
  const tb = useTB()
  return (
    <div
      className={cn(!tb && "rounded-xl border border-slate-200 bg-white p-4")}
      style={
        tb
          ? {
              backgroundColor: TEXTBOOK.content,
              borderLeft: `3px solid ${TEXTBOOK.accent}`,
              padding: "8px 12px",
              borderRadius: 4,
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function PassageBox({ children }: { children: ReactNode }) {
  const tb = useTB()
  return (
    <div
      className={cn(
        "overflow-y-auto text-sm leading-relaxed",
        !tb && "max-h-72 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800",
      )}
      style={
        tb
          ? {
              backgroundColor: TEXTBOOK.content,
              border: `1px solid ${TEXTBOOK.border}`,
              padding: "20px 25px",
              borderRadius: 6,
              lineHeight: 1.8,
              maxHeight: 300,
              color: TEXTBOOK.text,
              fontSize: 15,
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function TipBox({ children }: { children: ReactNode }) {
  const tb = useTB()
  return (
    <div
      className={cn(!tb && "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950")}
      style={
        tb
          ? {
              backgroundColor: TEXTBOOK.tipSoft,
              borderLeft: `4px solid ${TEXTBOOK.tip}`,
              padding: "12px 18px",
              borderRadius: 4,
              color: TEXTBOOK.text,
              fontSize: 14,
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  const tb = useTB()
  return (
    <div
      className={cn(!tb && "rounded-xl border border-slate-200 bg-white p-4", className)}
      style={
        tb
          ? {
              backgroundColor: TEXTBOOK.content,
              border: `1px solid ${TEXTBOOK.border}`,
              borderRadius: 6,
              padding: "12px 14px",
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function VocabChecklist({ raw }: { raw: BookExerciseRaw }) {
  return <ChipList items={asStringArray(raw.items)} className="mt-4" tone="vocab" />
}

function VocabTable({ raw }: { raw: BookExerciseRaw }) {
  const table = isRecord(raw.table) ? raw.table : {}
  const bank = asStringArray(raw.items)
  const tb = useTB()
  return (
    <div className="mt-4 space-y-4">
      {bank.length > 0 && (
        <div>
          <p
            className={cn("mb-2 text-xs font-medium uppercase tracking-wide", !tb && "text-slate-500")}
            style={tb ? { color: TEXTBOOK.muted } : undefined}
          >
            Word box
          </p>
          <ChipList items={bank} tone="vocab" />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(table).map(([col, vals]) => (
          <Panel key={col}>
            <h4
              className={cn("mb-3 text-sm font-semibold", !tb && "text-slate-900")}
              style={tb ? { color: TEXTBOOK.heading } : undefined}
            >
              {col}
            </h4>
            <ChipList items={asStringArray(vals)} tone="list" />
          </Panel>
        ))}
      </div>
    </div>
  )
}

function PrefixChoice({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = isRecord(raw.answers) ? raw.answers : {}
  const tb = useTB()
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={items} tone="list" />
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(answers).map(([prefix, vals]) => (
          <Panel key={prefix}>
            <h4
              className={cn("mb-2 font-semibold", !tb && "text-sky-800")}
              style={tb ? { color: TEXTBOOK.headingAccent } : undefined}
            >
              {prefix}
            </h4>
            <ChipList items={asStringArray(vals)} tone="vocab" />
          </Panel>
        ))}
      </div>
    </div>
  )
}

function WordFormation({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = asStringArray(raw.answers)
  const tb = useTB()
  return (
    <div className="mt-4 space-y-3">
      {items.map((item, i) => (
        <BlankRow key={item}>
          <div className="flex flex-wrap items-center gap-3 text-[15px]">
            <span className="font-medium" style={tb ? { color: TEXTBOOK.text } : undefined}>
              {item}
            </span>
            <span style={{ color: TEXTBOOK.muted }}>→</span>
            <span
              className={cn(!tb && "rounded-md bg-emerald-50 px-2 py-1 text-sm text-emerald-800")}
              style={
                tb
                  ? {
                      borderBottom: `2px dotted ${TEXTBOOK.accent}`,
                      minWidth: 120,
                      color: TEXTBOOK.headingAccent,
                      display: "inline-block",
                      padding: "0 4px",
                    }
                  : undefined
              }
            >
              {answers[i] ?? "______"}
            </span>
          </div>
        </BlankRow>
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
          <li key={idx}>
            <BlankRow>
              <p className="text-[15px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
                <span
                  className="mr-2 font-bold"
                  style={{ color: TEXTBOOK.headingAccent }}
                >
                  {idx + 1}.
                </span>
                {String(it.sentence ?? "")}
              </p>
              {"answer" in it && (
                <p
                  className="mt-2 text-sm font-semibold"
                  style={{ color: TEXTBOOK.correct }}
                >
                  {String(it.answer)}
                </p>
              )}
            </BlankRow>
          </li>
        )
      })}
    </ol>
  )
}

function Classification({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items)
  const answers = isRecord(raw.answers) ? raw.answers : {}
  const tb = useTB()
  return (
    <div className="mt-4 space-y-4">
      <ChipList items={items} tone="list" />
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(answers).map(([bucket, vals]) => (
          <Panel key={bucket}>
            <h4
              className={cn("mb-2 text-sm font-semibold capitalize", !tb && "text-slate-900")}
              style={tb ? { color: TEXTBOOK.heading } : undefined}
            >
              {bucket}
            </h4>
            <ChipList items={asStringArray(vals)} tone="collocation" />
          </Panel>
        ))}
      </div>
    </div>
  )
}

function ReadingTfng({ raw }: { raw: BookExerciseRaw }) {
  const questions = Array.isArray(raw.questions) ? raw.questions : []
  const options = Array.isArray(raw.options) ? raw.options : []
  const tb = useTB()
  return (
    <div className="mt-4 space-y-4">
      {typeof raw.title === "string" && (
        <h4
          className={cn("text-center text-base font-semibold", !tb && "underline decoration-slate-300 underline-offset-4 text-slate-900")}
          style={tb ? { color: TEXTBOOK.heading, fontSize: 16, fontWeight: 700 } : undefined}
        >
          {raw.title}
        </h4>
      )}
      <PassageBox>{String(raw.passage ?? "")}</PassageBox>
      {options.length > 0 && (
        <Panel>
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-wide"
            style={{ color: TEXTBOOK.muted }}
          >
            Options
          </p>
          <ul className="flex flex-wrap gap-[5px_15px] text-[14px] max-[650px]:flex-col">
            {options.map((opt, i) => {
              if (!isRecord(opt)) return null
              return (
                <li
                  key={i}
                  className="rounded px-3 py-1.5"
                  style={{
                    backgroundColor: TEXTBOOK.content,
                    border: `1px solid ${TEXTBOOK.border}`,
                  }}
                >
                  <span className="font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                    {String(opt.letter)}{" "}
                  </span>
                  {String(opt.text ?? opt.name ?? "")}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      {typeof raw.test_tip === "string" && <TipBox>{raw.test_tip}</TipBox>}
      {questions.length > 0 ? (
        <ol className="space-y-3">
          {questions.map((q) => {
            if (!isRecord(q)) return null
            return (
              <li key={String(q.number)}>
                <BlankRow>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[15px]" style={{ color: TEXTBOOK.text }}>
                      <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                        {String(q.number)}.
                      </span>
                      {String(q.statement ?? "")}
                    </p>
                    {q.answer != null ? (
                      <span
                        className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
                        style={{
                          backgroundColor: TEXTBOOK.correctSoft,
                          color: TEXTBOOK.correctDeep,
                        }}
                      >
                        {String(q.answer)}
                      </span>
                    ) : null}
                  </div>
                </BlankRow>
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
  const tb = useTB()
  return (
    <div
      className="mt-4 grid gap-2"
      style={
        tb
          ? { gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px 20px" }
          : undefined
      }
    >
      {rows.map((row, i) => {
        if (!isRecord(row)) return null
        return (
          <div
            key={i}
            className={cn(!tb && "grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2")}
            style={
              tb
                ? {
                    backgroundColor: TEXTBOOK.content,
                    border: `1px solid ${TEXTBOOK.borderAlt}`,
                    borderRadius: 4,
                    padding: "6px 20px",
                    fontSize: 14,
                  }
                : undefined
            }
          >
            <span style={{ color: TEXTBOOK.muted }}>{String(row.original ?? "")}</span>
            <span style={{ color: TEXTBOOK.muted }}> | </span>
            <span className="font-semibold" style={{ color: TEXTBOOK.headingAccent }}>
              {String(row.paraphrase ?? row.answer ?? "")}
            </span>
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
  const tb = useTB()
  return (
    <div className="mt-4 space-y-4">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      {typeof raw.test_tip === "string" && <TipBox>{raw.test_tip}</TipBox>}
      <Panel>
        {typeof notes.title === "string" && (
          <h4
            className="mb-3 font-semibold"
            style={tb ? { color: TEXTBOOK.heading } : undefined}
          >
            {notes.title}
          </h4>
        )}
        <ul className="space-y-2 text-[15px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
          {body.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </Panel>
      {answers.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase" style={{ color: TEXTBOOK.muted }}>
            Answers 1–{answers.length}
          </p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {answers.map((a, i) => (
              <li key={i} className="text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
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
        <li key={i}>
          <BlankRow>
            <p className="text-[15px]" style={{ color: TEXTBOOK.text }}>
              <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                {i + 1}.
              </span>
              {q}
            </p>
          </BlankRow>
        </li>
      ))}
    </ol>
  )
}

function ListeningStructured({ raw }: { raw: BookExerciseRaw }) {
  const items = Array.isArray(raw.items) ? raw.items : []
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      {items.map((it, i) => {
        if (!isRecord(it)) return null
        return (
          <Panel key={i}>
            <p className="font-semibold text-[15px]" style={{ color: TEXTBOOK.heading }}>
              Speaker {String(it.speaker)}
            </p>
            <p className="mt-1 text-sm" style={{ color: TEXTBOOK.muted }}>
              Person: {String(it.person ?? "—")}
            </p>
            <ChipList items={asStringArray(it.adjectives)} className="mt-2" tone="vocab" />
          </Panel>
        )
      })}
    </div>
  )
}

function ListeningMatch({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <p className="font-semibold" style={{ color: TEXTBOOK.heading }}>
            Speaker 1
          </p>
          <p className="mt-1 text-[15px]" style={{ color: TEXTBOOK.text }}>
            {String(raw.speaker_1 ?? "—")}
          </p>
        </Panel>
        <Panel>
          <p className="font-semibold" style={{ color: TEXTBOOK.heading }}>
            Speaker 2
          </p>
          <p className="mt-1 text-[15px]" style={{ color: TEXTBOOK.text }}>
            {String(raw.speaker_2 ?? "—")}
          </p>
        </Panel>
      </div>
    </div>
  )
}

function ExpressionNotes({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <Panel>
        <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
          Speaker 1
        </h4>
        <ChipList items={asStringArray(raw.speaker_1_expressions)} tone="phrase" />
      </Panel>
      <Panel>
        <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
          Speaker 2
        </h4>
        <ChipList items={asStringArray(raw.speaker_2_expressions)} tone="phrase" />
      </Panel>
    </div>
  )
}

function SummaryCompletion({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4 space-y-3">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      <PassageBox>{String(raw.summary ?? "")}</PassageBox>
      <ChipList items={asStringArray(raw.answers)} tone="vocab" />
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
      <ChipList items={bank} tone="vocab" />
      <ol className="space-y-3">
        {sentences.map((s, i) => {
          if (!isRecord(s)) return null
          return (
            <li key={i}>
              <BlankRow>
                <p className="text-[15px]" style={{ color: TEXTBOOK.text }}>
                  {String(s.sentence ?? "")}
                </p>
                {"answer" in s && (
                  <p className="mt-2 text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
                    {String(s.answer)}
                  </p>
                )}
              </BlankRow>
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
      <ChipList items={asStringArray(raw.words)} tone="list" />
      <PassageBox>
        <span className="whitespace-pre-wrap">{String(raw.text ?? "")}</span>
      </PassageBox>
      <ol className="grid gap-1 sm:grid-cols-2">
        {asStringArray(raw.answers).map((a, i) => (
          <li key={i} className="text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
            {i + 1}. {a}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ImagePrompt({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div
      className="mt-4 rounded-md border border-dashed p-6 text-center"
      style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.exerciseBg }}
    >
      <p className="text-sm font-medium" style={{ color: TEXTBOOK.heading }}>
        Image / mind map
      </p>
      {typeof raw.image_description === "string" && (
        <p className="mt-2 text-sm" style={{ color: TEXTBOOK.muted }}>
          {raw.image_description}
        </p>
      )}
    </div>
  )
}

function GraphTask({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div
      className="mt-4 rounded-md border border-dashed p-6 text-center"
      style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.exerciseBg }}
    >
      <p className="text-sm font-medium" style={{ color: TEXTBOOK.heading }}>
        Graph task
      </p>
      <p className="mt-2 text-sm" style={{ color: TEXTBOOK.muted }}>
        Use the book graph while students complete the prompts.
      </p>
      {Array.isArray(raw.answers) && (
        <ChipList items={asStringArray(raw.answers)} className="mt-4 justify-center" tone="list" />
      )}
    </div>
  )
}

function SpeakingTopic({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-4">
      <ChipList items={[String(raw.topic ?? "")]} tone="speaking" />
    </div>
  )
}

function AnswerList({ raw }: { raw: BookExerciseRaw }) {
  return <ChipList items={asStringArray(raw.answers)} className="mt-4" tone="vocab" />
}

function InstructionOnly() {
  return (
    <p className="mt-4 text-sm" style={{ color: TEXTBOOK.muted }}>
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
  /** `cambridge` / `textbook` = academic book page styles. */
  variant?: "admin" | "cambridge" | "textbook"
}) {
  const Renderer = RENDERERS[step.uiType] ?? (() => <InstructionOnly />)
  const raw = showAnswers ? step.raw : stripClientAnswers(step.raw)
  const textbook = variant === "cambridge" || variant === "textbook"

  if (textbook) {
    const exLabel =
      step.exerciseId === "test_practice"
        ? step.sectionLabel
        : /^\d/.test(String(step.exerciseId))
          ? String(step.exerciseId)
          : step.exerciseId
    return (
      <TextbookMode.Provider value={true}>
        <div
          className={cn("mb-[30px] last:mb-0", className)}
          style={{
            fontFamily: TEXTBOOK.font,
            backgroundColor: TEXTBOOK.exerciseBg,
            borderRadius: 6,
            padding: "15px 20px",
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className="text-[16px] font-bold"
              style={{
                backgroundColor: TEXTBOOK.accentSoft,
                color: TEXTBOOK.headingAccent,
                padding: "2px 10px",
                borderRadius: 4,
              }}
            >
              {exLabel}
            </span>
            <span
              className="text-[11px] font-semibold uppercase tracking-[1px]"
              style={{
                backgroundColor: TEXTBOOK.mutedSoft,
                color: TEXTBOOK.muted,
                padding: "2px 12px",
                borderRadius: 12,
              }}
            >
              {step.uiLabel}
            </span>
            {raw.audio_track != null ? <AudioMark track={String(raw.audio_track)} /> : null}
          </div>
          <Instruction text={step.instruction} />
          <Renderer raw={raw} />
          {showAnswers && <TeacherAnswers answers={step.answers ?? step.raw.answers} />}
        </div>
      </TextbookMode.Provider>
    )
  }

  return (
    <TextbookMode.Provider value={false}>
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
    </TextbookMode.Provider>
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
