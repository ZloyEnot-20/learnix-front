"use client"

import { createContext, useContext, Fragment, type CSSProperties, type ReactNode } from "react"
import type { BookExerciseRaw, BookExerciseUiType, LessonStep } from "@/lib/books/types"
import { TEXTBOOK } from "@/lib/books/textbook-theme"
import { requiresTypedWordForms } from "@/lib/books/word-form-exercise"
import { displayListeningTrack } from "@/lib/books/repair-listening-audio"
import { collectWordBoxItems, isCueWordBox } from "@/lib/books/word-box"
import { parseListeningTable, countTableGaps } from "@/lib/books/listening-table"
import { flattenNotes, notesTitle } from "@/lib/books/notes-outline"
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

/** Collect answer key from answer_key slice and/or embedded fields in raw. */
function collectTeacherAnswers(raw: BookExerciseRaw, key?: unknown): unknown {
  if (key != null) return key
  if (raw.answers != null) return raw.answers
  if (raw.answer != null) return raw.answer

  const fromQuestions =
    Array.isArray(raw.questions) &&
    raw.questions.some((q) => isRecord(q) && q.answer != null)
      ? raw.questions
          .filter((q): q is Record<string, unknown> => isRecord(q) && q.answer != null)
          .map((q) => ({
            number: q.number,
            answer: q.answer,
          }))
      : null
  if (fromQuestions?.length) return fromQuestions

  const fromItems =
    Array.isArray(raw.items) &&
    raw.items.some(
      (it) =>
        isRecord(it) &&
        (it.answer != null || it.paraphrase != null || it.person != null || it.adjectives != null),
    )
      ? raw.items
          .filter((it): it is Record<string, unknown> => isRecord(it))
          .map((it, i) => {
            if (it.answer != null) return { n: i + 1, answer: it.answer, sentence: it.sentence }
            if (it.paraphrase != null) return { original: it.original, paraphrase: it.paraphrase }
            if (it.speaker != null) {
              return {
                speaker: it.speaker,
                person: it.person,
                adjectives: it.adjectives,
              }
            }
            return null
          })
          .filter(Boolean)
      : null
  if (fromItems?.length) return fromItems

  const fromSentences =
    Array.isArray(raw.sentences) &&
    raw.sentences.some((s) => isRecord(s) && s.answer != null)
      ? raw.sentences
          .filter((s): s is Record<string, unknown> => isRecord(s) && s.answer != null)
          .map((s, i) => ({ n: i + 1, answer: s.answer }))
      : null
  if (fromSentences?.length) return fromSentences

  const fromParaphrases =
    Array.isArray(raw.paraphrases) &&
    raw.paraphrases.some((p) => isRecord(p) && p.paraphrase != null)
      ? raw.paraphrases
          .filter((p): p is Record<string, unknown> => isRecord(p))
          .map((p) => ({ original: p.original, paraphrase: p.paraphrase }))
      : null
  if (fromParaphrases?.length) return fromParaphrases

  if (raw.speaker_1 || raw.speaker_2) {
    return { speaker_1: raw.speaker_1, speaker_2: raw.speaker_2 }
  }
  if (raw.speaker_1_expressions || raw.speaker_2_expressions) {
    return {
      speaker_1_expressions: raw.speaker_1_expressions,
      speaker_2_expressions: raw.speaker_2_expressions,
    }
  }
  if (isRecord(raw.table) && Object.values(raw.table).some((v) => asStringArray(v).length > 0)) {
    return raw.table
  }

  return null
}

function formatAnswerLines(answers: unknown): string[] {
  if (answers == null) return []
  if (typeof answers === "string" || typeof answers === "number" || typeof answers === "boolean") {
    return [String(answers)]
  }
  if (Array.isArray(answers)) {
    return answers.flatMap((item, i) => {
      if (typeof item === "string" || typeof item === "number") return [`${i + 1}. ${item}`]
      if (!isRecord(item)) return [JSON.stringify(item)]
      if (item.answer != null && item.number != null) return [`${item.number}. ${item.answer}`]
      if (item.answer != null && item.n != null) return [`${item.n}. ${item.answer}`]
      if (item.answer != null) return [`${i + 1}. ${item.answer}`]
      if (item.original != null && item.paraphrase != null) {
        return [`${item.original} → ${item.paraphrase}`]
      }
      if (item.speaker != null) {
        const adj = asStringArray(item.adjectives).join(", ")
        return [`Speaker ${item.speaker}: ${item.person ?? "—"}${adj ? ` (${adj})` : ""}`]
      }
      return [JSON.stringify(item)]
    })
  }
  if (isRecord(answers)) {
    return Object.entries(answers).flatMap(([k, v]) => {
      const vals = asStringArray(v)
      if (vals.length > 0) return [`${k}: ${vals.join(", ")}`]
      if (typeof v === "string" || typeof v === "number") return [`${k}: ${v}`]
      if (Array.isArray(v)) return [`${k}: ${v.map(String).join(", ")}`]
      return [`${k}: ${JSON.stringify(v)}`]
    })
  }
  return [JSON.stringify(answers, null, 2)]
}

function TeacherAnswers({ answers }: { answers?: unknown }) {
  const tb = useTB()
  const lines = formatAnswerLines(answers)
  if (lines.length === 0) return null
  return (
    <details
      className="mt-3 rounded p-3"
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
          "cursor-pointer text-sm font-medium select-none",
          !tb && "text-amber-900",
        )}
        style={tb ? { color: TEXTBOOK.tipText } : undefined}
      >
        Answers
      </summary>
      <ol
        className={cn(
          "mt-3 max-h-64 list-none space-y-1.5 overflow-auto text-sm",
          !tb && "text-amber-950",
        )}
        style={tb ? { color: TEXTBOOK.text } : undefined}
      >
        {lines.map((line, i) => (
          <li key={i} className="font-medium leading-relaxed">
            {line}
          </li>
        ))}
      </ol>
    </details>
  )
}

function Instruction({ text }: { text: string }) {
  const tb = useTB()
  if (!text) return null
  return (
    <p
      className={cn(!tb && "text-sm leading-relaxed text-slate-700")}
      style={
        tb
          ? {
              fontSize: TEXTBOOK.type.instruction,
              lineHeight: TEXTBOOK.type.bodyLh,
              color: TEXTBOOK.text,
            }
          : undefined
      }
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
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
    vocab: {
      backgroundColor: TEXTBOOK.correctSoft,
      color: TEXTBOOK.correctDeep,
      fontStyle: "italic",
      padding: "2px 10px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
    collocation: {
      backgroundColor: TEXTBOOK.orangeSoft,
      color: TEXTBOOK.orange,
      padding: "2px 10px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
    phrase: {
      backgroundColor: TEXTBOOK.accentWash,
      color: TEXTBOOK.accentDeep,
      fontStyle: "italic",
      fontWeight: 600,
      padding: "2px 10px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
    speaking: {
      backgroundColor: TEXTBOOK.tipSoft,
      color: TEXTBOOK.tipText,
      fontStyle: "italic",
      border: `1px solid ${TEXTBOOK.tipBorder}`,
      padding: "4px 10px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
    default: {
      backgroundColor: TEXTBOOK.mutedSoft,
      color: TEXTBOOK.muted,
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: TEXTBOOK.type.chip,
    },
  }

  return (
    <div
      className={cn("flex flex-wrap", className)}
      style={{ gap: "6px 12px" }}
    >
      {items.map((item) => (
        <span key={item} className="text-[12px]" style={toneStyle[tone]}>
          {item}
        </span>
      ))}
    </div>
  )
}

function audioUrlOf(raw: BookExerciseRaw | Record<string, unknown>): string | null {
  const u = raw.audio_url
  return typeof u === "string" && u.trim() ? u.trim() : null
}

function AudioMark({
  track,
  url,
}: {
  track: string | number
  url?: string | null
}) {
  const tb = useTB()
  const label = displayListeningTrack(track)
  if (!label) return null
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-2",
        !tb && "rounded-full border px-2 py-0.5",
      )}
      style={
        tb
          ? { color: TEXTBOOK.audio, fontWeight: 600 }
          : undefined
      }
    >
      <span className="text-sm">♪ Audio {label}</span>
      {url ? (
        <audio
          controls
          preload="none"
          src={url}
          className="h-8 max-w-[min(100%,280px)]"
          onClick={(e) => e.stopPropagation()}
        >
          <track kind="captions" />
        </audio>
      ) : null}
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
              padding: "6px 10px",
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
              padding: "10px 12px",
              borderRadius: 6,
              lineHeight: TEXTBOOK.type.bodyLh,
              maxHeight: 260,
              color: TEXTBOOK.text,
              fontSize: TEXTBOOK.type.body,
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
              borderLeft: `3px solid ${TEXTBOOK.tip}`,
              padding: "8px 12px",
              borderRadius: 4,
              color: TEXTBOOK.text,
              fontSize: TEXTBOOK.type.caption,
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
              padding: "8px 10px",
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

function VocabChecklist({ raw }: { raw: BookExerciseRaw }) {
  const items = asStringArray(raw.items).length
    ? asStringArray(raw.items)
    : collectWordBoxItems(raw)
  return <ChipList items={items} className="mt-3" tone="vocab" />
}

function VocabTable({ raw }: { raw: BookExerciseRaw }) {
  const table = isRecord(raw.table) ? raw.table : {}
  const bank = asStringArray(raw.items)
  const tb = useTB()
  return (
    <div className="mt-3 space-y-3">
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
    <div className="mt-3 space-y-3">
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
    <div className="mt-3 space-y-2.5">
      {items.map((item, i) => (
        <BlankRow key={item}>
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
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
    <ol className="mt-3 space-y-2.5">
      {items.map((it, idx) => {
        if (!isRecord(it)) return null
        return (
          <li key={idx}>
            <BlankRow>
              <p className="text-[13px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
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
    <div className="mt-3 space-y-3">
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
    <div className="mt-3 space-y-3">
      {typeof raw.title === "string" && (
        <h4
          className={cn("text-center text-sm font-semibold", !tb && "underline decoration-slate-300 underline-offset-4 text-slate-900")}
          style={tb ? { color: TEXTBOOK.heading, fontSize: TEXTBOOK.type.section, fontWeight: 700 } : undefined}
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
          <ul className="flex flex-wrap gap-[5px_15px] text-[12px] max-[650px]:flex-col">
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
                    <p className="text-[13px]" style={{ color: TEXTBOOK.text }}>
                      <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                        {String(q.number)}.
                      </span>
                      {String(q.statement ?? q.text ?? "")}
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
  const bank = collectWordBoxItems(raw)
  const tb = useTB()
  return (
    <div className="mt-3 space-y-3">
      {bank.length > 0 ? <ChipList items={bank} tone="vocab" /> : null}
    <div
      className="grid gap-2"
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
                    padding: "4px 12px",
                    fontSize: TEXTBOOK.type.body,
                  }
                : undefined
            }
          >
            <span style={{ color: TEXTBOOK.muted }}>{String(row.original ?? "")}</span>
            <span style={{ color: TEXTBOOK.muted }}> | </span>
            <span className="font-semibold" style={{ color: TEXTBOOK.headingAccent }}>
              {row.paraphrase != null || row.answer != null
                ? String(row.paraphrase ?? row.answer ?? "")
                : "______"}
            </span>
          </div>
        )
      })}
    </div>
    </div>
  )
}

function ListeningNotes({ raw }: { raw: BookExerciseRaw }) {
  const notes = raw.notes
  const title = notesTitle(notes)
  const lines = flattenNotes(notes)
  const answers = Array.isArray(raw.answers)
    ? asStringArray(raw.answers)
    : Array.isArray(raw.blanks)
      ? raw.blanks
          .filter(isRecord)
          .map((b) => (b.answer != null ? String(b.answer) : ""))
          .filter(Boolean)
      : []
  const tb = useTB()
  return (
    <div className="mt-3 space-y-3">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      {typeof raw.test_tip === "string" && <TipBox>{raw.test_tip}</TipBox>}
      {typeof raw.passage === "string" && raw.passage.trim() ? (
        <PassageBox>{raw.passage}</PassageBox>
      ) : null}
      <Panel>
        {(title || lines.length > 0) && (
          <h4
            className="mb-3 font-semibold"
            style={tb ? { color: TEXTBOOK.heading } : undefined}
          >
            {title || "Notes"}
          </h4>
        )}
        <ul className="space-y-2 text-[13px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
          {lines.map((line, i) => {
            const prev = lines[i - 1]
            const showHeading = Boolean(line.heading && line.heading !== prev?.heading)
            return (
              <li key={i}>
                {showHeading ? (
                  <p
                    className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: TEXTBOOK.headingAccent }}
                  >
                    {line.heading}
                  </p>
                ) : null}
                <p>
                  {line.text.split(/(\d+[.)]?\s*_{2,}|_{2,}|\u2026{2,}|\.{3,}|…+)/).map((part, pi) =>
                    /_{2,}|\u2026{2,}|\.{3,}|…/.test(part) ? (
                      <input
                        key={pi}
                        type="text"
                        readOnly
                        className="mx-0.5 inline-block min-w-[4.5rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[12px] outline-none"
                        style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.text }}
                        placeholder="…"
                      />
                    ) : (
                      <span key={pi}>{part}</span>
                    ),
                  )}
                </p>
              </li>
            )
          })}
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
  const bank = collectWordBoxItems(raw)
  return (
    <div className="mt-3 space-y-3">
      {bank.length > 0 ? <ChipList items={bank} tone="vocab" /> : null}
      <ol className="space-y-2.5">
        {questions.map((q, i) => (
          <li key={i}>
            <BlankRow>
              <p className="text-[13px]" style={{ color: TEXTBOOK.text }}>
                <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                  {i + 1}.
                </span>
                {q}
              </p>
            </BlankRow>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ListeningStructured({ raw }: { raw: BookExerciseRaw }) {
  const items = Array.isArray(raw.items) ? raw.items : []
  return (
    <div className="mt-3 space-y-2.5">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      {items.map((it, i) => {
        if (!isRecord(it)) return null
        return (
          <Panel key={i}>
            <p className="font-semibold text-[13px]" style={{ color: TEXTBOOK.heading }}>
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
    <div className="mt-3 space-y-2.5">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel>
          <p className="font-semibold" style={{ color: TEXTBOOK.heading }}>
            Speaker 1
          </p>
          <p className="mt-1 text-[13px]" style={{ color: TEXTBOOK.text }}>
            {String(raw.speaker_1 ?? "—")}
          </p>
        </Panel>
        <Panel>
          <p className="font-semibold" style={{ color: TEXTBOOK.heading }}>
            Speaker 2
          </p>
          <p className="mt-1 text-[13px]" style={{ color: TEXTBOOK.text }}>
            {String(raw.speaker_2 ?? "—")}
          </p>
        </Panel>
      </div>
    </div>
  )
}

function ExpressionNotes({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
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
    <div className="mt-3 space-y-2.5">
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
  const typed = requiresTypedWordForms(raw.instruction)
  return (
    <div className="mt-3 space-y-3">
      <ChipList items={bank} tone="vocab" />
      {typed ? (
        <p className="text-[11px]" style={{ color: TEXTBOOK.muted }}>
          Change the form if needed, then type your answer in each blank.
        </p>
      ) : null}
      <ol className="space-y-3">
        {sentences.map((s, i) => {
          if (!isRecord(s)) return null
          const text = String(s.sentence ?? s.text ?? "")
          const parts = text.split(/_{2,}|\u2026{2,}|\.{3,}|…+/)
          return (
            <li key={i}>
              <BlankRow>
                <p className="text-[13px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
                  <span
                    className="mr-2 font-bold"
                    style={{ color: TEXTBOOK.headingAccent }}
                  >
                    {i + 1}.
                  </span>
                  {parts.map((part, pi) => (
                    <Fragment key={pi}>
                      {part}
                      {pi < parts.length - 1 ? (
                        <input
                          type="text"
                          readOnly
                          aria-label={`Blank ${i + 1}`}
                          className="mx-1 inline-block min-w-[5.5rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[13px] outline-none"
                          style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.text }}
                          placeholder="…"
                        />
                      ) : null}
                    </Fragment>
                  ))}
                </p>
              </BlankRow>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function GapFillPassage({ raw }: { raw: BookExerciseRaw }) {
  const typed = requiresTypedWordForms(raw.instruction)
  const text = String(raw.text ?? raw.passage ?? "")
  const parts = text.split(/((?:\d+[.)]\s*)?_{2,})/)
  return (
    <div className="mt-3 space-y-3">
      <ChipList items={asStringArray(raw.words)} tone="list" />
      {typed ? (
        <p className="text-[11px]" style={{ color: TEXTBOOK.muted }}>
          Change the form if needed, then type your answer in each blank.
        </p>
      ) : null}
      <PassageBox>
        <span className="whitespace-pre-wrap">
          {parts.map((part, i) =>
            /_{2,}/.test(part) ? (
              <input
                key={i}
                type="text"
                readOnly
                className="mx-0.5 inline-block min-w-[4.5rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[13px] outline-none"
                style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.text }}
                placeholder="…"
              />
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </span>
      </PassageBox>
    </div>
  )
}

function ImagePrompt({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div
      className="mt-3 rounded-md border border-dashed p-3 text-center"
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
      className="mt-3 rounded-md border border-dashed p-3 text-center"
      style={{ borderColor: TEXTBOOK.border, backgroundColor: TEXTBOOK.exerciseBg }}
    >
      <p className="text-sm font-medium" style={{ color: TEXTBOOK.heading }}>
        Graph task
      </p>
      <p className="mt-2 text-sm" style={{ color: TEXTBOOK.muted }}>
        Use the book graph while students complete the prompts.
      </p>
      {Array.isArray(raw.answers) && (
        <ChipList items={asStringArray(raw.answers)} className="mt-3 justify-center" tone="list" />
      )}
    </div>
  )
}

function SpeakingTopic({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-3">
      <ChipList items={[String(raw.topic ?? "")]} tone="speaking" />
    </div>
  )
}

function AnswerList({ raw }: { raw: BookExerciseRaw }) {
  return <ChipList items={asStringArray(raw.answers)} className="mt-3" tone="vocab" />
}

function InstructionOnly({ raw }: { raw?: BookExerciseRaw }) {
  const bank = raw ? collectWordBoxItems(raw) : []
  if (bank.length === 0) {
    return (
      <p className="mt-3 text-sm" style={{ color: TEXTBOOK.muted }}>
        Follow the instruction with the class. No additional item bank in the book JSON.
      </p>
    )
  }
  return (
    <div className="mt-3 space-y-3">
      <ChipList items={bank} tone="vocab" />
      {isCueWordBox(raw ?? {}) ? (
        <ol className="space-y-2">
          {bank.map((w, i) => (
            <li key={i}>
              <BlankRow>
                <p className="text-[13px]" style={{ color: TEXTBOOK.text }}>
                  <span className="font-semibold" style={{ color: TEXTBOOK.headingAccent }}>
                    {w}
                  </span>
                  {": "}
                  <input
                    type="text"
                    readOnly
                    className="mx-1 inline-block min-w-[8rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[13px] outline-none"
                    style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.text }}
                    placeholder="…"
                  />
                </p>
              </BlankRow>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

function WordBoxNotes({ raw }: { raw: BookExerciseRaw }) {
  const bank = collectWordBoxItems(raw)
  const cue = isCueWordBox(raw)
  return (
    <div className="mt-3 space-y-3">
      <ChipList items={bank} tone="vocab" />
      {cue ? (
        <ol className="space-y-2">
          {bank.map((w, i) => (
            <li key={i}>
              <BlankRow>
                <p className="text-[13px]" style={{ color: TEXTBOOK.text }}>
                  <span className="font-semibold" style={{ color: TEXTBOOK.headingAccent }}>
                    {w}
                  </span>
                  {": "}
                  <input
                    type="text"
                    readOnly
                    className="mx-1 inline-block min-w-[8rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[13px] outline-none"
                    style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.text }}
                    placeholder="…"
                  />
                </p>
              </BlankRow>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[12px]" style={{ color: TEXTBOOK.muted }}>
          Use the words in the box with the task above.
        </p>
      )}
    </div>
  )
}

function MultipleChoice({ raw }: { raw: BookExerciseRaw }) {
  const questions = Array.isArray(raw.questions) ? raw.questions : []
  return (
    <ol className="mt-3 space-y-3">
      {questions.map((q, i) => {
        if (!isRecord(q)) return null
        const options = Array.isArray(q.options) ? q.options : []
        return (
          <li key={String(q.number ?? i)}>
            <BlankRow>
              <p className="text-[13px] leading-relaxed" style={{ color: TEXTBOOK.text }}>
                <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                  {String(q.number ?? i + 1)}.
                </span>
                {String(q.text ?? q.statement ?? "")}
              </p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {options.map((opt, oi) => {
                  const label = typeof opt === "string" ? opt : String(opt ?? "")
                  const selected =
                    q.answer != null &&
                    (label.startsWith(String(q.answer)) ||
                      label === String(q.answer) ||
                      label.replace(/^[A-D]\.?\s*/i, "") === String(q.answer))
                  return (
                    <li
                      key={oi}
                      className="rounded px-2 py-1.5 text-[12px]"
                      style={{
                        backgroundColor: selected ? TEXTBOOK.correctSoft : TEXTBOOK.content,
                        border: `1px solid ${selected ? TEXTBOOK.correct : TEXTBOOK.border}`,
                        color: selected ? TEXTBOOK.correctDeep : TEXTBOOK.text,
                      }}
                    >
                      {label}
                    </li>
                  )
                })}
              </ul>
            </BlankRow>
          </li>
        )
      })}
    </ol>
  )
}

function ShortAnswer({ raw }: { raw: BookExerciseRaw }) {
  const questions = Array.isArray(raw.questions) ? raw.questions : []
  const options = Array.isArray(raw.options) ? raw.options : []
  return (
    <div className="mt-3 space-y-3">
      {typeof raw.passage === "string" && raw.passage ? (
        <PassageBox>{raw.passage}</PassageBox>
      ) : null}
      {options.length > 0 && (
        <Panel>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: TEXTBOOK.muted }}>
            Options
          </p>
          <ul className="flex flex-wrap gap-[5px_15px] text-[12px]">
            {options.map((opt, i) => {
              if (!isRecord(opt)) {
                return (
                  <li key={i} className="rounded px-3 py-1.5" style={{ border: `1px solid ${TEXTBOOK.border}` }}>
                    {String(opt)}
                  </li>
                )
              }
              return (
                <li
                  key={i}
                  className="rounded px-3 py-1.5"
                  style={{ backgroundColor: TEXTBOOK.content, border: `1px solid ${TEXTBOOK.border}` }}
                >
                  <span className="font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                    {String(opt.letter ?? "")}{" "}
                  </span>
                  {String(opt.text ?? opt.name ?? "")}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}
      <ol className="space-y-3">
        {questions.map((q, i) => {
          if (!isRecord(q)) return null
          return (
            <li key={String(q.number ?? i)}>
              <BlankRow>
                <p className="text-[13px]" style={{ color: TEXTBOOK.text }}>
                  <span className="mr-2 font-bold" style={{ color: TEXTBOOK.headingAccent }}>
                    {String(q.number ?? i + 1)}.
                  </span>
                  {String(q.text ?? q.statement ?? "")}
                </p>
                {q.answer != null ? (
                  <p className="mt-2 text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
                    {String(q.answer)}
                  </p>
                ) : null}
              </BlankRow>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function MatchingPairs({ raw }: { raw: BookExerciseRaw }) {
  const left = Array.isArray(raw.beginnings)
    ? raw.beginnings
    : Array.isArray(raw.people)
      ? raw.people
      : Array.isArray(raw.left)
        ? raw.left
        : []
  const right = Array.isArray(raw.endings)
    ? raw.endings
    : Array.isArray(raw.statements)
      ? raw.statements
      : Array.isArray(raw.right)
        ? raw.right
        : []
  const labelLeft = (item: unknown, i: number) => {
    if (typeof item === "string") return `${i + 1}. ${item}`
    if (!isRecord(item)) return String(item)
    return `${String(item.letter ?? item.number ?? i + 1)}. ${String(item.text ?? item.name ?? "")}`
  }
  const labelRight = (item: unknown, i: number) => {
    if (typeof item === "string") return item
    if (!isRecord(item)) return String(item)
    return `${String(item.letter ?? item.number ?? String.fromCharCode(97 + i))}. ${String(item.text ?? item.name ?? "")}`
  }
  const leftTitle = Array.isArray(raw.jobs) ? "Jobs" : "Match from"
  const rightTitle = Array.isArray(raw.jobs) ? "Definitions" : "Options"
  return (
    <div className="mt-3 grid gap-4 md:grid-cols-2">
      <Panel>
        <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
          {leftTitle}
        </h4>
        <ul className="space-y-2 text-[12px]" style={{ color: TEXTBOOK.text }}>
          {left.map((item, i) => (
            <li key={i}>{labelLeft(item, i)}</li>
          ))}
        </ul>
      </Panel>
      <Panel>
        <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
          {rightTitle}
        </h4>
        <ul className="space-y-2 text-[12px]" style={{ color: TEXTBOOK.text }}>
          {right.map((item, i) => (
            <li key={i}>{labelRight(item, i)}</li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function ListeningTable({ raw }: { raw: BookExerciseRaw }) {
  const model = parseListeningTable(raw)
  if (!model) {
    return (
      <p className="mt-3 text-sm" style={{ color: TEXTBOOK.muted }}>
        Table data missing.
      </p>
    )
  }
  const blankAnswers = Array.isArray(raw.blanks)
    ? Object.fromEntries(
        raw.blanks
          .filter(isRecord)
          .filter((b) => b.number != null)
          .map((b) => [String(b.number), b.answer != null ? String(b.answer) : ""]),
      )
    : {}
  const answersList = Array.isArray(raw.answers) ? asStringArray(raw.answers) : []
  const gapCount = Math.max(
    countTableGaps(model),
    Array.isArray(raw.blanks) ? raw.blanks.length : 0,
  )
  const titleCase = (s: string) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <div className="mt-3 space-y-3">
      {raw.audio_track != null && <AudioMark track={String(raw.audio_track)} />}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]" style={{ color: TEXTBOOK.text }}>
          <thead>
            <tr>
              {model.columns.map((c) => (
                <th
                  key={c}
                  className="border px-2 py-1.5 font-semibold"
                  style={{
                    borderColor: TEXTBOOK.border,
                    backgroundColor: TEXTBOOK.content,
                    color: TEXTBOOK.heading,
                  }}
                >
                  {titleCase(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row, ri) => (
              <tr key={ri}>
                {model.columns.map((c) => (
                  <td
                    key={c}
                    className="border px-2 py-1.5 align-top leading-relaxed"
                    style={{ borderColor: TEXTBOOK.border }}
                  >
                    {String(row[c] ?? "")
                      .split(/(\d+[.)]?\s*_{2,}|_{2,}|\u2026{2,}|\.{3,}|…+)/)
                      .map((part, pi) => {
                        const numMatch = part.match(/^(\d+)[.)]?\s*_{2,}/)
                        if (numMatch || /_{2,}|\u2026{2,}|\.{3,}|…/.test(part)) {
                          const n = numMatch?.[1]
                          const ans = n ? blankAnswers[n] : ""
                          return (
                            <input
                              key={pi}
                              type="text"
                              readOnly
                              defaultValue={ans || undefined}
                              className="mx-0.5 inline-block min-w-[4.5rem] border-0 border-b-2 bg-transparent px-1 py-0 text-[12px] outline-none"
                              style={{ borderColor: TEXTBOOK.accent, color: TEXTBOOK.correct }}
                              placeholder="…"
                            />
                          )
                        }
                        return <span key={pi}>{part}</span>
                      })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {gapCount > 0 ? (
        <p className="text-[11px]" style={{ color: TEXTBOOK.muted }}>
          Complete {gapCount} gap{gapCount === 1 ? "" : "s"} (NO MORE THAN TWO WORDS OR A NUMBER).
        </p>
      ) : null}
      {answersList.length > 0 ? (
        <ol className="grid gap-1 sm:grid-cols-2">
          {Array.isArray(raw.blanks)
            ? raw.blanks.filter(isRecord).map((b, i) => (
                <li key={i} className="text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
                  {String(b.number ?? i + 1)}. {String(b.answer ?? "")}
                </li>
              ))
            : answersList.slice(0, gapCount).map((a, i) => (
                <li key={i} className="text-sm font-semibold" style={{ color: TEXTBOOK.correct }}>
                  {i + 1}. {a}
                </li>
              ))}
        </ol>
      ) : null}
    </div>
  )
}

function PassageRead({ raw }: { raw: BookExerciseRaw }) {
  return (
    <div className="mt-3 space-y-2.5">
      {typeof raw.title === "string" ? (
        <h4 className="text-center text-sm font-semibold" style={{ color: TEXTBOOK.heading, fontSize: TEXTBOOK.type.section }}>
          {raw.title}
        </h4>
      ) : null}
      <PassageBox>{String(raw.passage ?? "")}</PassageBox>
      {Array.isArray(raw.advantages) ? (
        <Panel>
          <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
            Advantages
          </h4>
          <ChipList items={asStringArray(raw.advantages)} tone="vocab" />
        </Panel>
      ) : null}
      {raw.disadvantage != null ? (
        <Panel>
          <h4 className="mb-2 text-sm font-semibold" style={{ color: TEXTBOOK.heading }}>
            Disadvantage
          </h4>
          <p className="text-[12px]" style={{ color: TEXTBOOK.text }}>
            {String(raw.disadvantage)}
          </p>
        </Panel>
      ) : null}
    </div>
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
  "instruction-only": ({ raw }) => <InstructionOnly raw={raw} />,
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
  "multiple-choice": MultipleChoice,
  "short-answer": ShortAnswer,
  "matching-pairs": MatchingPairs,
  "listening-table": ListeningTable,
  "passage-read": PassageRead,
  "word-box-notes": WordBoxNotes,
}

export function BookExerciseRenderer({
  step,
  className,
  showAnswers = true,
  variant = "admin",
  active = false,
  actions,
}: {
  step: LessonStep
  className?: string
  /**
   * When true, show a collapsible answer key under the exercise.
   * The exercise body is always rendered without answers (same as students).
   */
  showAnswers?: boolean
  /** `cambridge` / `textbook` = academic book page styles. */
  variant?: "admin" | "cambridge" | "textbook"
  /** Live assignment highlight — green border with “Active” on the top edge. */
  active?: boolean
  /** Assign / Finish controls nestled in the exercise header. */
  actions?: ReactNode
}) {
  const Renderer = RENDERERS[step.uiType] ?? (({ raw }) => <InstructionOnly raw={raw} />)
  // Always strip — teachers see the same exercise body as students; keys live in TeacherAnswers.
  const raw = stripClientAnswers(step.raw)
  const teacherAnswers = showAnswers
    ? collectTeacherAnswers(step.raw, step.answers)
    : null
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
          className={cn("relative last:mb-0", className)}
          style={{
            fontFamily: TEXTBOOK.font,
            backgroundColor: active ? TEXTBOOK.correctSoft : TEXTBOOK.exerciseBg,
            borderRadius: 6,
            padding: `${TEXTBOOK.space.exercisePadY}px ${TEXTBOOK.space.exercisePadX}px`,
            marginBottom: TEXTBOOK.space.exerciseGap,
            border: active ? `2px solid ${TEXTBOOK.correct}` : `1px solid ${TEXTBOOK.border}`,
          }}
        >
          {active ? (
            <span
              className="absolute left-3 top-0 -translate-y-1/2 rounded px-1.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                backgroundColor: TEXTBOOK.content,
                color: TEXTBOOK.correctDeep,
                lineHeight: "14px",
              }}
            >
              Active
            </span>
          ) : null}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span
              className="font-bold"
              style={{
                backgroundColor: TEXTBOOK.accentSoft,
                color: TEXTBOOK.headingAccent,
                padding: "1px 8px",
                borderRadius: 4,
                fontSize: TEXTBOOK.type.exLabel,
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
            {raw.audio_track != null ? (
              <AudioMark track={String(raw.audio_track)} url={audioUrlOf(raw)} />
            ) : null}
            {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
          </div>
          <Instruction text={step.instruction} />
          <Renderer raw={raw} />
          {showAnswers && <TeacherAnswers answers={teacherAnswers} />}
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
          {raw.audio_track != null ? (
            <AudioMark track={String(raw.audio_track)} url={audioUrlOf(raw)} />
          ) : null}
        </div>
        <Instruction text={step.instruction} />
        <Renderer raw={raw} />
        {showAnswers && <TeacherAnswers answers={teacherAnswers} />}
      </div>
    </TextbookMode.Provider>
  )
}

/** Match student payloads: keep structure (bucket labels, stems) but remove solutions. */
function stripClientAnswers(raw: BookExerciseRaw): BookExerciseRaw {
  const clone = structuredClone(raw)

  // Keep classification / prefix bucket labels, clear contents
  if (clone.answers && typeof clone.answers === "object" && !Array.isArray(clone.answers)) {
    clone.answers = Object.fromEntries(
      Object.keys(clone.answers as Record<string, unknown>).map((k) => [k, []]),
    )
  } else {
    delete clone.answers
  }
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
        if ("speaker" in next) {
          delete next.person
          delete next.adjectives
        }
        if ("original" in next && "paraphrase" in next) {
          delete next.paraphrase
        }
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
  if (Array.isArray(clone.paraphrases)) {
    clone.paraphrases = clone.paraphrases.map((p) =>
      p && typeof p === "object" ? { original: (p as Record<string, unknown>).original } : p,
    )
  }
  if (clone.table && typeof clone.table === "object") {
    clone.table = Object.fromEntries(
      Object.keys(clone.table as Record<string, unknown>).map((k) => [k, []]),
    )
  }
  if (clone.speaker_1_expressions) clone.speaker_1_expressions = []
  if (clone.speaker_2_expressions) clone.speaker_2_expressions = []
  if (typeof clone.speaker_1 === "string") clone.speaker_1 = ""
  if (typeof clone.speaker_2 === "string") clone.speaker_2 = ""

  return clone
}
