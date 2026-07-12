/**
 * Official-style IELTS Reading catalogue types used for admin/student filters.
 * Keys are stable slugs; labels are shown in the UI.
 */

export const READING_QUESTION_TYPE_LABELS: Record<string, string> = {
  "multiple-choice": "Multiple Choice",
  "true-false-not-given": "True / False / Not Given",
  "yes-no-not-given": "Yes / No / Not Given",
  "matching-headings": "Matching Headings",
  "matching-information": "Matching Information",
  "matching-features": "Matching Features",
  "matching-sentence-endings": "Matching Sentence Endings",
  "sentence-completion": "Sentence Completion",
  "summary-completion": "Summary Completion",
  "note-completion": "Note Completion",
  "table-completion": "Table Completion",
  "flow-chart-completion": "Flow-chart Completion",
  "diagram-label-completion": "Diagram Label Completion",
  "short-answer": "Short Answer Questions",
  "selecting-a-title": "Selecting a Title",
  "summary-completion-word-box": "Completing a Summary with a Box of Words",
  "diagram-completion": "Completing a Diagram",
  "note-completion-word-box": "Completing Notes with a Box of Words",
  "table-completion-word-box": "Completing a Table with a Box of Words",
  "flow-chart-completion-word-box": "Completing a Flow Chart with a Box of Words",
}

/** Preferred order for filter buttons. */
export const READING_QUESTION_TYPE_ORDER = [
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
] as const

export type ReadingCatalogType = (typeof READING_QUESTION_TYPE_ORDER)[number]

const KNOWN_TYPES = new Set<string>(READING_QUESTION_TYPE_ORDER)

/** Coarse types that often wrap matching / completion tasks — never trust alone. */
const COARSE_STORED = new Set([
  "multiple-choice",
  "fill-in-blank",
  "one_choice",
  "short-answer",
])

function hasWordBox(text: string): boolean {
  return (
    /list of words/i.test(text) ||
    /box of words/i.test(text) ||
    /using the list of/i.test(text) ||
    /from the list of words/i.test(text) ||
    /choose (your answers )?from the (list|box)/i.test(text) ||
    /\b[a-k]\s*[-–]\s*[a-k]\b/i.test(text)
  )
}

/**
 * Classify one reading task block into a catalogue filter type.
 * Instruction text wins over coarse stored types (e.g. matching stored as multiple-choice).
 */
export function classifyReadingCatalogType(input: {
  instruction?: string
  questionInstruction?: string
  questionType?: string
  hasOptions?: boolean
  title?: string
}): string {
  const stored = (input.questionType || "").trim()

  const text = [
    input.instruction,
    input.questionInstruction,
    input.title,
    // Include stored only when it is not a coarse alias that hides matching tasks
    COARSE_STORED.has(stored) ? "" : stored,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  const wordBox =
    hasWordBox(text) ||
    Boolean(input.hasOptions && /summary|notes?|table|flow|diagram/i.test(text))

  // Matching / choice tasks first (specific → general)
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
  if (
    /correct ending|complete each sentence with the correct ending|ending,? a-/i.test(text)
  ) {
    return "matching-sentence-endings"
  }
  if (
    /match each|list of (people|researchers|organisations|organizations|brands|statements)|classify the following|correct (person|academic|researcher)/i.test(
      text,
    )
  ) {
    return "matching-features"
  }
  if (/suitable title|most appropriate title|choose.*(a |the )?title for|best title for/i.test(text)) {
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

  if (
    /choose the correct letter/i.test(text) &&
    !/ending|heading|paragraph contains/i.test(text)
  ) {
    return "multiple-choice"
  }

  if (/answer the questions? below|short answer/i.test(text)) {
    return "short-answer"
  }

  // Completions
  if (/flow[\s-]?chart|flowchart/i.test(text)) {
    return wordBox ? "flow-chart-completion-word-box" : "flow-chart-completion"
  }
  if (/complete the labels on the diagram|diagram label|label(s)? on the diagram/i.test(text)) {
    return "diagram-label-completion"
  }
  if (/complete( the)? diagram|diagram below/i.test(text)) {
    return "diagram-completion"
  }
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

  // Trust already-canonical stored types (after instruction pass)
  if (KNOWN_TYPES.has(stored)) {
    if (
      (stored === "summary-completion" ||
        stored === "note-completion" ||
        stored === "table-completion" ||
        stored === "flow-chart-completion") &&
      (wordBox || input.hasOptions)
    ) {
      return `${stored}-word-box`
    }
    return stored
  }

  // Fallbacks from coarse / engnovate stored types
  if (stored === "true_false_notgiven") return "true-false-not-given"
  if (stored === "yes_no_notgiven") return "yes-no-not-given"
  if (stored === "one_choice" || stored === "multiple-choice") return "multiple-choice"
  if (stored === "matching_sentence_endings") return "matching-sentence-endings"
  if (stored === "matching_headings") return "matching-headings"
  if (stored === "matching_information") return "matching-information"
  if (stored === "matching_features") return "matching-features"
  if (stored === "summary_completion") {
    return wordBox || input.hasOptions ? "summary-completion-word-box" : "summary-completion"
  }
  if (stored === "sentence_completion") return "sentence-completion"
  if (stored === "note_completion") {
    return wordBox || input.hasOptions ? "note-completion-word-box" : "note-completion"
  }
  if (stored === "table_completion") {
    return wordBox || input.hasOptions ? "table-completion-word-box" : "table-completion"
  }
  if (stored === "flow_chart_completion") {
    return wordBox || input.hasOptions ? "flow-chart-completion-word-box" : "flow-chart-completion"
  }
  if (stored === "diagram_labelling") return "diagram-label-completion"
  if (stored === "short-answer") return "short-answer"
  if (stored === "fill-in-blank") {
    if (wordBox) return "summary-completion-word-box"
    return "sentence-completion"
  }

  return stored || "sentence-completion"
}

/** Collect unique catalogue types for one reading test payload. */
export function collectReadingCatalogTypes(data: {
  parts?: Array<{
    instruction?: string
    questionInstruction?: string
    sections?: Array<{
      instruction?: string
      title?: string
      options?: unknown[]
      questions?: Array<{ type?: string }>
    }>
    questions?: Array<{ type?: string }>
  }>
}): string[] {
  const types = new Set<string>()
  for (const part of data?.parts ?? []) {
    if (part.sections?.length) {
      for (const section of part.sections) {
        const qType = section.questions?.[0]?.type
        types.add(
          classifyReadingCatalogType({
            instruction: section.instruction || part.instruction,
            questionInstruction: part.questionInstruction,
            questionType: qType,
            hasOptions: Boolean(section.options?.length),
            title: section.title,
          }),
        )
      }
      continue
    }
    // Legacy parts without sections: classify from part-level instruction + first question type
    if (part.questions?.length) {
      types.add(
        classifyReadingCatalogType({
          instruction: part.instruction,
          questionInstruction: part.questionInstruction,
          questionType: part.questions[0]?.type,
          hasOptions: part.questions.some(
            (q) => Array.isArray((q as { options?: unknown[] }).options),
          ),
        }),
      )
    }
  }
  return sortReadingQuestionTypes([...types])
}

export function readingQuestionTypeLabel(type: string): string {
  return (
    READING_QUESTION_TYPE_LABELS[type] ??
    type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

export function sortReadingQuestionTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ai = READING_QUESTION_TYPE_ORDER.indexOf(a as ReadingCatalogType)
    const bi = READING_QUESTION_TYPE_ORDER.indexOf(b as ReadingCatalogType)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

/** Only types that appear in at least one test. */
export function collectAvailableReadingTypes(
  readings: { questionTypes?: string[] }[],
): string[] {
  const set = new Set<string>()
  for (const reading of readings) {
    for (const type of reading.questionTypes ?? []) {
      if (KNOWN_TYPES.has(type) || READING_QUESTION_TYPE_LABELS[type]) {
        set.add(type)
      }
    }
  }
  return sortReadingQuestionTypes([...set]).filter(
    (type) => countReadingsByQuestionType(readings, type) > 0,
  )
}

export function filterReadingsByQuestionType<T extends { questionTypes?: string[] }>(
  readings: T[],
  type: string | null,
): T[] {
  if (!type) return readings
  return readings.filter((reading) => (reading.questionTypes ?? []).includes(type))
}

export function countReadingsByQuestionType(
  readings: { questionTypes?: string[] }[],
  type: string,
): number {
  return readings.filter((reading) => (reading.questionTypes ?? []).includes(type)).length
}
