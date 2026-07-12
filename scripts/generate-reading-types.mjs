/**
 * Builds public/reading-types.json for production filter chips when API omits questionTypes.
 * Run before `next build` (see package.json build).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const READING_DIR = path.resolve(__dirname, "../../exercises/ielts/reading")
const OUT = path.resolve(__dirname, "../public/reading-types.json")

const KNOWN_TYPES = new Set([
  "multiple-choice",
  "true-false-not-given",
  "yes-no-not-given",
  "matching-headings",
  "matching-information",
  "matching-features",
  "matching-sentence-endings",
  "sentence-completion",
  "summary-completion",
  "note-completion",
  "table-completion",
  "flow-chart-completion",
  "diagram-label-completion",
  "short-answer",
  "selecting-a-title",
  "summary-completion-word-box",
  "diagram-completion",
  "note-completion-word-box",
  "table-completion-word-box",
  "flow-chart-completion-word-box",
])

const COARSE_STORED = new Set([
  "multiple-choice",
  "fill-in-blank",
  "one_choice",
  "short-answer",
])

function hasWordBox(text) {
  return (
    /list of words/i.test(text) ||
    /box of words/i.test(text) ||
    /using the list of/i.test(text) ||
    /from the list of words/i.test(text) ||
    /choose (your answers )?from the (list|box)/i.test(text) ||
    /\b[a-k]\s*[-–]\s*[a-k]\b/i.test(text)
  )
}

function classifyReadingCatalogType({
  instruction = "",
  questionInstruction = "",
  questionType = "",
  hasOptions = false,
  title = "",
} = {}) {
  const stored = String(questionType || "").trim()

  const text = [
    instruction,
    questionInstruction,
    title,
    COARSE_STORED.has(stored) ? "" : stored,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  const wordBox =
    hasWordBox(text) || Boolean(hasOptions && /summary|notes?|table|flow|diagram/i.test(text))

  if (/list of headings|correct heading|suitable heading|most suitable headings/i.test(text)) {
    return "matching-headings"
  }
  if (
    /which (paragraph|section)s? contains|contains the following information|which section contains/i.test(
      text,
    )
  ) {
    return "matching-information"
  }
  if (/correct ending|complete each sentence with the correct ending|ending,? a-/i.test(text)) {
    return "matching-sentence-endings"
  }
  if (
    /match each|list of (people|researchers|organisations|organizations|brands|statements)|classify the following|correct (person|academic|researcher)/i.test(
      text,
    )
  ) {
    return "matching-features"
  }
  if (
    /suitable title|most appropriate title|choose.*(a |the )?title for|best title for/i.test(text)
  ) {
    return "selecting-a-title"
  }
  if (
    /yes\s*\/?\s*no\s*\/?\s*not\s*given|agrees with the (claims|views)|claims of the writer|views of the writer|reflects the claims/i.test(
      text,
    )
  ) {
    return "yes-no-not-given"
  }
  if (
    /true\s*\/?\s*false\s*\/?\s*not\s*given|agrees with the information|contradicts the information/i.test(
      text,
    )
  ) {
    return "true-false-not-given"
  }
  if (/choose the correct letter/i.test(text) && !/ending|heading|paragraph contains/i.test(text)) {
    return "multiple-choice"
  }
  if (/answer the questions? below|short answer/i.test(text)) return "short-answer"
  if (/flow[\s-]?chart|flowchart/i.test(text)) {
    return wordBox ? "flow-chart-completion-word-box" : "flow-chart-completion"
  }
  if (/complete the labels on the diagram|diagram label|label(s)? on the diagram/i.test(text)) {
    return "diagram-label-completion"
  }
  if (/complete( the)? diagram|diagram below/i.test(text)) return "diagram-completion"
  if (/complete the summary|summary below/i.test(text)) {
    return wordBox ? "summary-completion-word-box" : "summary-completion"
  }
  if (/complete the notes|notes below/i.test(text)) {
    return wordBox ? "note-completion-word-box" : "note-completion"
  }
  if (/complete the table|table below/i.test(text)) {
    return wordBox ? "table-completion-word-box" : "table-completion"
  }
  if (/complete the sentences?|complete each sentence(?! with the correct ending)/i.test(text)) {
    return "sentence-completion"
  }

  if (KNOWN_TYPES.has(stored)) {
    if (
      (stored === "summary-completion" ||
        stored === "note-completion" ||
        stored === "table-completion" ||
        stored === "flow-chart-completion") &&
      (wordBox || hasOptions)
    ) {
      return `${stored}-word-box`
    }
    return stored
  }

  if (stored === "fill-in-blank") {
    return wordBox ? "summary-completion-word-box" : "sentence-completion"
  }
  return stored || "sentence-completion"
}

function collectQuestionTypes(data) {
  const types = new Set()
  for (const part of data.parts ?? []) {
    if (part.sections?.length) {
      for (const section of part.sections) {
        types.add(
          classifyReadingCatalogType({
            instruction: section.instruction || part.instruction,
            questionInstruction: part.questionInstruction,
            questionType: section.questions?.[0]?.type,
            hasOptions: Boolean(section.options?.length),
            title: section.title,
          }),
        )
      }
      continue
    }
    if (part.questions?.length) {
      types.add(
        classifyReadingCatalogType({
          instruction: part.instruction,
          questionInstruction: part.questionInstruction,
          questionType: part.questions[0]?.type,
          hasOptions: part.questions.some((q) => Array.isArray(q?.options) && q.options.length > 0),
        }),
      )
    }
  }
  return [...types].sort()
}

function main() {
  const indexPath = path.join(READING_DIR, "index.json")
  if (!fs.existsSync(indexPath)) {
    console.warn("[generate-reading-types] skip: missing index.json")
    return
  }

  const { items } = JSON.parse(fs.readFileSync(indexPath, "utf8"))
  const bySlug = {}
  const allTypes = new Set()

  for (const item of items ?? []) {
    const filePath = path.join(READING_DIR, item.file)
    if (!fs.existsSync(filePath)) continue
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"))
    const types = collectQuestionTypes(data)
    bySlug[item.id] = types
    for (const t of types) allTypes.add(t)
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(bySlug, null, 0))
  console.log(
    `[generate-reading-types] wrote ${Object.keys(bySlug).length} slug(s), ${allTypes.size} unique type(s) → public/reading-types.json`,
  )
  console.log(`[generate-reading-types] types: ${[...allTypes].sort().join(", ")}`)
}

main()
