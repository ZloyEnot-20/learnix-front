/**
 * Rule-based converter: OCR text → exercise JSON for the "Manage exercises"
 * uploader. It is deliberately conservative — it recognises the common worksheet
 * layouts below and reports what it could not parse via `warnings` so a human can
 * fix the rest. It never guesses a correct answer it cannot justify.
 *
 * Supported layouts:
 *   • Numbered multiple-choice with lettered options:
 *       1. She ___ to school.
 *          a) go   b) goes   c) going
 *       (options may also be on separate lines: "a) go")
 *   • Fill-in-the-blank: a numbered line containing "____" (3+ underscores).
 *   • True / False: a numbered statement ending with "(T/F)" or "True/False".
 *   • An optional answer key anywhere:
 *       "Answers: 1-b 2-a 3-c"  or  "Key: 1. goes 2. play"  (letters or words)
 */
import type { GrammarExercise, GrammarQuestion } from "./grammar-types"

export interface ParsedExercises {
  exercises: GrammarExercise[]
  warnings: string[]
}

const BLANK_TOKEN = "_____"

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "imported"
  )
}

interface RawQuestion {
  num: number
  text: string
  options: { letter: string; text: string }[]
}

/** Parse "Answers: 1-b 2 a 3. goes" → { 1: "b", 2: "a", 3: "goes" }. */
function parseAnswerKey(lines: string[]): { key: Record<number, string>; keyLineIdx: number[] } {
  const key: Record<number, string> = {}
  const keyLineIdx: number[] = []
  const headerRe = /\b(answers?|answer\s*key|key|ответы?|javob(lar)?|kalit)\b/i

  lines.forEach((line, idx) => {
    const hasHeader = headerRe.test(line)
    // A "compact key" line has several "<num><sep><value>" pairs, e.g. "1-b 2-c".
    const pairs = [...line.matchAll(/(\d{1,3})\s*[.)\-:]\s*([A-Za-z][\w'’-]*)/g)]
    if (hasHeader || pairs.length >= 2) {
      for (const m of pairs) key[Number(m[1])] = m[2]
      if (pairs.length > 0) keyLineIdx.push(idx)
    }
  })
  return { key, keyLineIdx }
}

/** Collect numbered questions with their lettered options. */
function parseQuestions(lines: string[], skip: Set<number>): RawQuestion[] {
  const questions: RawQuestion[] = []
  const qRe = /^\s*(\d{1,3})[.)]\s+(.*\S)\s*$/
  const inlineOptRe = /\b([a-dA-D])[.)]\s+([^\n]+?)(?=\s+[a-dA-D][.)]\s+|$)/g
  const lineOptRe = /^\s*([a-dA-D])[.)]\s+(.*\S)\s*$/

  let current: RawQuestion | null = null
  lines.forEach((line, idx) => {
    if (skip.has(idx)) return

    const lineOpt = line.match(lineOptRe)
    if (current && lineOpt) {
      current.options.push({ letter: lineOpt[1].toLowerCase(), text: lineOpt[2].trim() })
      return
    }

    const q = line.match(qRe)
    if (q) {
      if (current) questions.push(current)
      let text = q[2]
      const options: { letter: string; text: string }[] = []
      // Options inlined on the same line as the question stem.
      const inline = [...text.matchAll(inlineOptRe)]
      if (inline.length >= 2) {
        const firstAt = text.search(/\b[a-dA-D][.)]\s+/)
        if (firstAt > 0) text = text.slice(0, firstAt).trim()
        for (const m of inline) options.push({ letter: m[1].toLowerCase(), text: m[2].trim() })
      }
      current = { num: Number(q[1]), text, options }
    }
  })
  if (current) questions.push(current)
  return questions
}

type QType = "multiple-choice" | "fill-in-the-blank" | "true-false"

function classify(q: RawQuestion): QType {
  if (/\(\s*(t\s*\/\s*f|true\s*\/\s*false)\s*\)/i.test(q.text)) return "true-false"
  if (q.options.length >= 2) return "multiple-choice"
  if (/_{3,}/.test(q.text)) return "fill-in-the-blank"
  // A bare statement with an answer key letter t/f also counts as true-false.
  return "fill-in-the-blank"
}

function normaliseBlanks(text: string): string {
  return text.replace(/_{3,}/g, BLANK_TOKEN)
}

function buildExercise(
  type: GrammarExercise["type"],
  title: string,
  questions: GrammarQuestion[],
): GrammarExercise {
  const slug = `${slugify(title)}-${type}`
  return {
    id: slug,
    slug,
    title,
    description: `Imported from OCR — ${questions.length} ${type} question${
      questions.length === 1 ? "" : "s"
    }. Review before assigning.`,
    category: "grammar",
    topic: slugify(title),
    subtopic: type,
    difficulty: "easy",
    level: "A1",
    type,
    estimatedTime: Math.max(5, Math.round(questions.length * 0.75)),
    totalQuestions: questions.length,
    passingScore: Math.ceil(questions.length * 0.6),
    tags: ["imported", "ocr"],
    instructions: "Imported from a scanned worksheet. Please verify the answers.",
    tips: [],
    content: { questions },
  }
}

export function parseExercisesFromText(raw: string): ParsedExercises {
  const warnings: string[] = []
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.trim().length > 0)

  if (lines.length === 0) {
    return { exercises: [], warnings: ["The text is empty."] }
  }

  const { key, keyLineIdx } = parseAnswerKey(lines)
  const hasKey = Object.keys(key).length > 0
  const skip = new Set(keyLineIdx)

  // Title: the first non-numbered, non-option line (a heading), else a default.
  const headingLine = lines.find(
    (l) => !/^\s*\d{1,3}[.)]/.test(l) && !/^\s*[a-dA-D][.)]/.test(l),
  )
  const title = headingLine ? headingLine.slice(0, 80).trim() : "Imported worksheet"

  const rawQuestions = parseQuestions(lines, skip)
  if (rawQuestions.length === 0) {
    return {
      exercises: [],
      warnings: [
        "No numbered questions were detected. Expected lines like '1. ...' with options 'a) ... b) ...'.",
      ],
    }
  }

  const byType: Record<QType, GrammarQuestion[]> = {
    "multiple-choice": [],
    "fill-in-the-blank": [],
    "true-false": [],
  }
  let missingAnswers = 0

  for (const q of rawQuestions) {
    const type = classify(q)
    const answer = key[q.num]

    if (type === "multiple-choice") {
      const options = q.options.map((o) => o.text)
      let correctAnswer = ""
      if (answer) {
        const byLetter = q.options.find((o) => o.letter === answer.toLowerCase())
        const byText = q.options.find(
          (o) => o.text.toLowerCase() === answer.toLowerCase(),
        )
        correctAnswer = (byLetter ?? byText)?.text ?? ""
      }
      if (!correctAnswer) missingAnswers++
      byType["multiple-choice"].push({
        id: q.num,
        text: q.text,
        options,
        correctAnswer,
        explanation: "",
      })
    } else if (type === "true-false") {
      const cleaned = q.text.replace(/\(\s*(t\s*\/\s*f|true\s*\/\s*false)\s*\)/i, "").trim()
      let correctBool: boolean | undefined
      if (answer) {
        const a = answer.toLowerCase()
        if (["t", "true", "верно", "togri", "to'g'ri"].includes(a)) correctBool = true
        else if (["f", "false", "неверно", "notogri"].includes(a)) correctBool = false
      }
      if (correctBool === undefined) missingAnswers++
      byType["true-false"].push({
        id: q.num,
        text: cleaned,
        correctBool: correctBool ?? true,
        explanation: "",
      })
    } else {
      const text = normaliseBlanks(q.text)
      const blanks = answer ? [answer] : [""]
      if (!answer) missingAnswers++
      byType["fill-in-the-blank"].push({
        id: q.num,
        text,
        blanks,
        acceptableAnswers: [answer ? [answer] : []],
        explanation: "",
      })
    }
  }

  const exercises: GrammarExercise[] = []
  ;(Object.keys(byType) as QType[]).forEach((type) => {
    const qs = byType[type]
    if (qs.length === 0) return
    const suffix =
      type === "multiple-choice" ? "MCQ" : type === "true-false" ? "True/False" : "Gap-fill"
    exercises.push(buildExercise(type, `${title} — ${suffix}`, qs))
  })

  if (!hasKey) {
    warnings.push("No answer key found — correct answers are blank. Fill them in before saving.")
  } else if (missingAnswers > 0) {
    warnings.push(`${missingAnswers} question(s) had no matching answer in the key.`)
  }
  warnings.push(
    `Detected ${rawQuestions.length} question(s) across ${exercises.length} exercise(s). Always review before assigning.`,
  )

  return { exercises, warnings }
}

/** sessionStorage handoff key: OCR section → Manage exercises uploader. */
export const OCR_HANDOFF_KEY = "ocr:exercise-json"
