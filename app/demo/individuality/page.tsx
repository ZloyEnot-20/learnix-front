"use client"

import { useMemo, useState } from "react"
import { Check, Headphones, RotateCcw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const PURPLE = {
  deep: "#4A2C7A",
  mid: "#6B3FA0",
  soft: "#EDE4F7",
  wash: "#F7F2FC",
  line: "#C4A8E0",
  note: "#5B3A8C",
}

const ITEMS_1_1 = ["clothes", "bedroom", "car", "internet", "music", "hairstyle"] as const

/** Typical listening mentions for demo check (1.2). */
const ANSWERS_1_2 = new Set(["clothes", "music", "hairstyle", "car"])

const PHRASAL_1_3 = ["blend in with", "stand out from", "fit in with"] as const
const ANSWER_1_3 = new Set(["blend in with", "fit in with"])

const BANK_1_4 = [
  "fit in (with)",
  "stand out (from)",
  "break away (from)",
  "opt out (of)",
  "blend in (with)",
  "drop out (of)",
  "join in",
] as const

type Blank14 = {
  id: string
  sentenceBefore: string
  underlined: string
  sentenceAfter: string
  /** Accept any of these normalized answers */
  answers: string[]
}

const BLANKS_1_4: Blank14[] = [
  {
    id: "1",
    sentenceBefore: "I feel uncomfortable if I'm forced to ",
    underlined: "participate in",
    sentenceAfter: " group activities.",
    answers: ["join in"],
  },
  {
    id: "2a",
    sentenceBefore: "I don't like to ",
    underlined: "be noticeable",
    sentenceAfter: " in the crowd. I'd rather ",
    answers: ["stand out (from)", "stand out"],
  },
  {
    id: "2b",
    sentenceBefore: "",
    underlined: "look the same as",
    sentenceAfter: " everyone else.",
    answers: ["blend in (with)", "blend in"],
  },
  {
    id: "3",
    sentenceBefore: "My friends started going out late to nightclubs so I decided to ",
    underlined: "dissociate myself from",
    sentenceAfter: " the group.",
    answers: ["break away (from)", "break away"],
  },
  {
    id: "4",
    sentenceBefore: "When people feel isolated and rejected, they sometimes ",
    underlined: "abandon",
    sentenceAfter: " society altogether.",
    answers: ["drop out (of)", "drop out", "opt out (of)", "opt out"],
  },
  {
    id: "5",
    sentenceBefore:
      "New migrants may feel that by changing to ",
    underlined: "assimilate into",
    sentenceAfter: " their new community, they are losing some part of their individuality.",
    answers: ["fit in (with)", "fit in", "blend in (with)", "blend in"],
  },
]

const MATCH_STEMS = [
  "In the past, tattoos were judged to be",
  "Tattoos are now",
  "Famous people help to establish",
  "Throughout the United States, local governments have developed",
  "Society's previous attitude towards people with tattoos could be described as",
] as const

const MATCH_ENDINGS = [
  { letter: "A", text: "stereotypical." },
  { letter: "B", text: "a more tolerant attitude." },
  { letter: "C", text: "harmful to society." },
  { letter: "D", text: "behaviour patterns." },
  { letter: "E", text: "self-destructive." },
  { letter: "F", text: "approved of by society." },
] as const

/** From book answer_key unit_3 / 2.1 */
const ANSWERS_2_1 = ["C", "F", "D", "B", "A"] as const

function normalizePhrase(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[()]/g, "")
}

function ExNum({ n }: { n: string }) {
  return (
    <span
      className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] px-1.5 text-[12px] font-bold text-white"
      style={{ backgroundColor: PURPLE.mid }}
    >
      {n}
    </span>
  )
}

function WordBank({ words, title }: { words: readonly string[]; title?: string }) {
  return (
    <div
      className="my-3 rounded-sm border px-3 py-2.5"
      style={{ backgroundColor: PURPLE.soft, borderColor: PURPLE.line }}
    >
      {title ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: PURPLE.note }}>
          {title}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {words.map((w) => (
          <span key={w} className="font-serif text-[14px] italic text-slate-800">
            {w}
          </span>
        ))}
      </div>
    </div>
  )
}

function ChipPick({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? "" : opt)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[12px] transition",
              selected
                ? "border-transparent text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-violet-300",
              disabled && "cursor-default opacity-80",
            )}
            style={selected ? { backgroundColor: PURPLE.mid } : undefined}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function IndividualityDemoPage() {
  const [ticks11, setTicks11] = useState<Record<string, boolean>>({})
  const [ticks12, setTicks12] = useState<Record<string, boolean>>({})
  const [pick13, setPick13] = useState<string[]>([])
  const [answers14, setAnswers14] = useState<Record<string, string>>({})
  const [match21, setMatch21] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [selectedBlank14, setSelectedBlank14] = useState<string | null>(null)

  const toggle13 = (word: string) => {
    setPick13((prev) => {
      if (prev.includes(word)) return prev.filter((w) => w !== word)
      if (prev.length >= 2) return [prev[1], word]
      return [...prev, word]
    })
  }

  const result = useMemo(() => {
    if (!checked) return null

    let correct = 0
    let total = 0

    // 1.2 listening ticks
    for (const item of ITEMS_1_1) {
      total += 1
      const should = ANSWERS_1_2.has(item)
      const got = Boolean(ticks12[item])
      if (should === got) correct += 1
    }

    // 1.3
    total += 1
    const set13 = new Set(pick13)
    if (set13.size === 2 && [...ANSWER_1_3].every((w) => set13.has(w))) correct += 1

    // 1.4
    for (const blank of BLANKS_1_4) {
      total += 1
      const given = normalizePhrase(answers14[blank.id] ?? "")
      if (blank.answers.some((a) => normalizePhrase(a) === given)) correct += 1
    }

    // 2.1
    ANSWERS_2_1.forEach((ans, i) => {
      total += 1
      if ((match21[i] ?? "").toUpperCase() === ans) correct += 1
    })

    return { correct, total, pct: total ? Math.round((100 * correct) / total) : 0 }
  }, [checked, ticks12, pick13, answers14, match21])

  const reset = () => {
    setTicks11({})
    setTicks12({})
    setPick13([])
    setAnswers14({})
    setMatch21({})
    setChecked(false)
    setSelectedBlank14(null)
  }

  const blankOk = (blank: Blank14) => {
    if (!checked) return null
    const given = normalizePhrase(answers14[blank.id] ?? "")
    return blank.answers.some((a) => normalizePhrase(a) === given)
  }

  return (
    <div className="min-h-screen bg-[#E8E0F0] px-3 py-6 sm:px-6">
      <div className="mx-auto mb-4 flex max-w-[920px] flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-800/70">
            Learnix demo · Cambridge Vocab style
          </p>
          <h1 className="text-lg font-semibold text-slate-900">Unit 3 · Individuality (interactive page)</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {result ? (
            <span
              className="rounded-full px-3 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: result.pct >= 70 ? "#059669" : result.pct >= 40 ? "#D97706" : "#DC2626" }}
            >
              {result.correct}/{result.total} · {result.pct}%
            </span>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => setChecked(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-white"
            style={{ backgroundColor: PURPLE.mid }}
          >
            <Check className="h-3.5 w-3.5" />
            Check answers
          </button>
        </div>
      </div>

      {/* Textbook page */}
      <article
        className="mx-auto grid max-w-[920px] overflow-hidden rounded-sm bg-white shadow-[0_12px_40px_rgba(74,44,122,0.18)] lg:grid-cols-[1fr_220px]"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        <div className="relative p-5 sm:p-7 lg:pr-5">
          {/* Unit title banner */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div
              className="inline-block px-4 py-2 text-[22px] font-bold tracking-tight text-white sm:text-[26px]"
              style={{ backgroundColor: PURPLE.deep, fontFamily: "system-ui, sans-serif" }}
            >
              Individuality
            </div>
            <MohawkArt className="hidden shrink-0 sm:block" />
          </div>

          {/* 1.1 */}
          <section className="mb-5">
            <p className="text-[14.5px] leading-relaxed text-slate-900">
              <ExNum n="1.1" />
              How do people use these things to express their individuality?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {ITEMS_1_1.map((item) => (
                <label key={item} className="flex cursor-pointer items-center gap-2 text-[14px]">
                  <input
                    type="checkbox"
                    checked={Boolean(ticks11[item])}
                    onChange={() => setTicks11((p) => ({ ...p, [item]: !p[item] }))}
                    className="h-3.5 w-3.5 accent-violet-700"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 1.2 */}
          <section className="mb-5">
            <p className="text-[14.5px] leading-relaxed text-slate-900">
              <ExNum n="1.2" />
              <span
                className="mr-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: PURPLE.mid, fontFamily: "system-ui, sans-serif" }}
              >
                <Headphones className="h-3 w-3" />
                06
              </span>
              Listen to someone talking about individuality and tick the things in 1.1 that he
              mentions.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {ITEMS_1_1.map((item) => {
                const on = Boolean(ticks12[item])
                const should = ANSWERS_1_2.has(item)
                const show = checked
                return (
                  <label
                    key={item}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-[14px]",
                      show && should && on && "bg-emerald-50",
                      show && should && !on && "bg-rose-50",
                      show && !should && on && "bg-rose-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        setChecked(false)
                        setTicks12((p) => ({ ...p, [item]: !p[item] }))
                      }}
                      className="h-3.5 w-3.5 accent-violet-700"
                    />
                    <span>{item}</span>
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-[12px] text-slate-500" style={{ fontFamily: "system-ui, sans-serif" }}>
              Demo tip: imagine the speaker mentioned clothes, car, music and hairstyle.
            </p>
          </section>

          {/* 1.3 */}
          <section className="mb-5">
            <p className="text-[14.5px] leading-relaxed text-slate-900">
              <ExNum n="1.3" />
              Now listen again and notice these phrasal verbs. Which two have a similar meaning?
            </p>
            <WordBank words={PHRASAL_1_3} />
            <div className="flex flex-wrap gap-2">
              {PHRASAL_1_3.map((w) => {
                const selected = pick13.includes(w)
                const ok = checked && ANSWER_1_3.has(w) && selected
                const bad = checked && selected && !ANSWER_1_3.has(w)
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setChecked(false)
                      toggle13(w)
                    }}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-[13px] italic transition",
                      selected ? "text-white" : "bg-white text-slate-800",
                      ok && "ring-2 ring-emerald-400",
                      bad && "ring-2 ring-rose-400",
                    )}
                    style={{
                      borderColor: selected ? PURPLE.mid : PURPLE.line,
                      backgroundColor: selected ? PURPLE.mid : undefined,
                    }}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-[12px] text-slate-500" style={{ fontFamily: "system-ui, sans-serif" }}>
              Select exactly two.
            </p>
          </section>

          {/* 1.4 */}
          <section className="mb-5">
            <p className="text-[14.5px] leading-relaxed text-slate-900">
              <ExNum n="1.4" />
              Check the meanings of the phrasal verbs in the box. Replace the underlined phrases in
              the sentences below with a phrasal verb from the box. There may be more than one
              possible answer.
            </p>
            <WordBank words={BANK_1_4} />

            <ol className="mt-3 space-y-3">
              {/* Sentence 1 */}
              <li className="text-[14.5px] leading-relaxed">
                <span className="mr-1 font-semibold" style={{ color: PURPLE.mid }}>
                  1
                </span>
                {BLANKS_1_4[0].sentenceBefore}
                <BlankSlot
                  selected={selectedBlank14 === "1"}
                  value={answers14["1"]}
                  underlined={BLANKS_1_4[0].underlined}
                  ok={blankOk(BLANKS_1_4[0])}
                  onSelect={() => setSelectedBlank14((c) => (c === "1" ? null : "1"))}
                />
                {BLANKS_1_4[0].sentenceAfter}
              </li>

              {/* Sentence 2 — two blanks */}
              <li className="text-[14.5px] leading-relaxed">
                <span className="mr-1 font-semibold" style={{ color: PURPLE.mid }}>
                  2
                </span>
                {BLANKS_1_4[1].sentenceBefore}
                <BlankSlot
                  selected={selectedBlank14 === "2a"}
                  value={answers14["2a"]}
                  underlined={BLANKS_1_4[1].underlined}
                  ok={blankOk(BLANKS_1_4[1])}
                  onSelect={() => setSelectedBlank14((c) => (c === "2a" ? null : "2a"))}
                />
                {BLANKS_1_4[1].sentenceAfter}
                <BlankSlot
                  selected={selectedBlank14 === "2b"}
                  value={answers14["2b"]}
                  underlined={BLANKS_1_4[2].underlined}
                  ok={blankOk(BLANKS_1_4[2])}
                  onSelect={() => setSelectedBlank14((c) => (c === "2b" ? null : "2b"))}
                />
                {BLANKS_1_4[2].sentenceAfter}
              </li>

              {[BLANKS_1_4[3], BLANKS_1_4[4], BLANKS_1_4[5]].map((blank, idx) => (
                <li key={blank.id} className="text-[14.5px] leading-relaxed">
                  <span className="mr-1 font-semibold" style={{ color: PURPLE.mid }}>
                    {idx + 3}
                  </span>
                  {blank.sentenceBefore}
                  <BlankSlot
                    selected={selectedBlank14 === blank.id}
                    value={answers14[blank.id]}
                    underlined={blank.underlined}
                    ok={blankOk(blank)}
                    onSelect={() => setSelectedBlank14((c) => (c === blank.id ? null : blank.id))}
                  />
                  {blank.sentenceAfter}
                </li>
              ))}
            </ol>

            <div className="mt-3 rounded-sm border border-dashed border-violet-200 bg-violet-50/50 p-3">
              <p
                className="mb-2 text-[12px] font-semibold"
                style={{ color: PURPLE.note, fontFamily: "system-ui, sans-serif" }}
              >
                {selectedBlank14
                  ? `Blank selected — tap a phrasal verb`
                  : "Tap an underlined phrase, then choose a verb from the bank"}
              </p>
              <ChipPick
                options={BANK_1_4}
                value={selectedBlank14 ? answers14[selectedBlank14] ?? "" : ""}
                onChange={(v) => {
                  if (!selectedBlank14) return
                  setChecked(false)
                  setAnswers14((p) => ({ ...p, [selectedBlank14]: v }))
                }}
              />
            </div>
          </section>

          {/* 2.1 */}
          <section className="mb-2">
            <p className="text-[14.5px] leading-relaxed text-slate-900">
              <ExNum n="2.1" />
              Read the passage on the opposite page and complete these sentences with the correct
              ending (A–F).
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <ol className="space-y-2.5">
                {MATCH_STEMS.map((stem, i) => {
                  const letter = match21[i] ?? ""
                  const ok = checked ? letter.toUpperCase() === ANSWERS_2_1[i] : null
                  return (
                    <li key={stem} className="text-[13.5px] leading-snug">
                      <div className="flex gap-2">
                        <span className="font-semibold" style={{ color: PURPLE.mid }}>
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p>{stem}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <select
                              value={letter}
                              onChange={(e) => {
                                setChecked(false)
                                setMatch21((p) => ({ ...p, [i]: e.target.value }))
                              }}
                              className={cn(
                                "h-8 rounded-sm border bg-white px-2 text-[13px] outline-none",
                                ok === true && "border-emerald-400 bg-emerald-50",
                                ok === false && "border-rose-400 bg-rose-50",
                              )}
                              style={{ borderColor: ok == null ? PURPLE.line : undefined }}
                            >
                              <option value="">—</option>
                              {MATCH_ENDINGS.map((e) => (
                                <option key={e.letter} value={e.letter}>
                                  {e.letter}
                                </option>
                              ))}
                            </select>
                            {letter ? (
                              <span className="text-[12px] text-slate-500">
                                {MATCH_ENDINGS.find((e) => e.letter === letter)?.text}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
              <div
                className="rounded-sm border p-3"
                style={{ borderColor: PURPLE.line, backgroundColor: PURPLE.wash }}
              >
                <ul className="space-y-2 text-[13.5px]">
                  {MATCH_ENDINGS.map((e) => (
                    <li key={e.letter}>
                      <span className="font-bold" style={{ color: PURPLE.mid }}>
                        {e.letter}{" "}
                      </span>
                      {e.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <p className="mt-6 text-[12px] text-slate-400" style={{ fontFamily: "system-ui, sans-serif" }}>
            18
          </p>
        </div>

        {/* Sidebar */}
        <aside className="border-t border-violet-100 bg-[#FAF7FD] p-4 lg:border-l lg:border-t-0">
          <MohawkArt className="mx-auto mb-4 sm:hidden" />
          <div
            className="rounded-sm border-2 p-3"
            style={{ borderColor: PURPLE.mid, backgroundColor: "#fff" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-sm text-sm font-bold text-white"
                style={{ backgroundColor: PURPLE.mid, fontFamily: "system-ui, sans-serif" }}
              >
                V
              </span>
              <h2
                className="text-[14px] font-bold"
                style={{ color: PURPLE.deep, fontFamily: "system-ui, sans-serif" }}
              >
                Vocabulary note
              </h2>
            </div>
            <div className="space-y-3 text-[12.5px] leading-relaxed text-slate-700">
              <p>
                <span className="line-through decoration-rose-500">Individualities</span> and{" "}
                <span className="line-through decoration-rose-500">behaviours</span> are not usually
                used in the plural. Prefer{" "}
                <strong style={{ color: PURPLE.deep }}>individuality</strong> and{" "}
                <strong style={{ color: PURPLE.deep }}>behaviour</strong>.
              </p>
              <p>
                <strong style={{ color: PURPLE.deep }}>Originality</strong> means the quality of
                being new and different in a good way.
              </p>
              <p className="rounded-sm bg-violet-50 px-2 py-1.5 italic text-slate-600">
                “Her clothes show real originality.”
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-sm border border-violet-100 bg-white p-3 text-[12px] text-slate-600">
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-violet-800">
              <Sparkles className="h-3.5 w-3.5" />
              How to use
            </div>
            <ul className="list-disc space-y-1 pl-4">
              <li>Tick items for 1.1 / 1.2</li>
              <li>Pick two similar phrasal verbs in 1.3</li>
              <li>Tap underlines → choose from the bank in 1.4</li>
              <li>Match A–F endings in 2.1</li>
              <li>Press Check answers</li>
            </ul>
          </div>
        </aside>
      </article>
    </div>
  )
}

function BlankSlot({
  selected,
  value,
  underlined,
  ok,
  onSelect,
}: {
  selected: boolean
  value?: string
  underlined: string
  ok: boolean | null
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "mx-0.5 inline-flex min-w-[7rem] items-center justify-center rounded-sm border-b-2 px-1 py-0.5 text-[13px] transition",
        selected && "bg-violet-100",
        ok === true && "border-emerald-500 bg-emerald-50 text-emerald-800",
        ok === false && "border-rose-500 bg-rose-50 text-rose-800",
        ok == null && "border-violet-400 text-slate-800",
      )}
    >
      {value ? (
        <span className="font-semibold italic">{value}</span>
      ) : (
        <span className="underline decoration-slate-800 underline-offset-2">{underlined}</span>
      )}
    </button>
  )
}

function MohawkArt({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="120"
      height="110"
      viewBox="0 0 120 110"
      fill="none"
      aria-hidden
    >
      <ellipse cx="60" cy="98" rx="38" ry="8" fill="#EDE4F7" />
      <path d="M35 70c0 18 12 28 25 28s25-10 25-28V58H35v12z" fill="#5B3A8C" />
      <circle cx="60" cy="48" r="22" fill="#F5D0B0" />
      <path
        d="M42 28c4-16 12-24 18-24 4 0 6 6 8 6s4-6 8-6c6 0 14 8 18 24-8 2-14 4-26 4s-18-2-26-4z"
        fill="#6B3FA0"
      />
      <path d="M52 20c2-12 6-16 8-16s6 4 8 16" fill="#4A2C7A" />
      <rect x="42" y="44" width="14" height="6" rx="2" fill="#1e1b4b" />
      <rect x="64" y="44" width="14" height="6" rx="2" fill="#1e1b4b" />
      <path d="M55 58c2 3 8 3 10 0" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="28" cy="72" r="10" fill="#F5D0B0" />
      <circle cx="92" cy="72" r="10" fill="#F5D0B0" />
      <path d="M18 82h20v16H18z" fill="#7C3AED" />
      <path d="M82 82h20v16H82z" fill="#A78BFA" />
    </svg>
  )
}
