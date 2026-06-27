/** Human-readable labels for IELTS Reading question types (filter chips & cards). */
export const READING_QUESTION_TYPE_LABELS: Record<string, string> = {
  "multiple-choice": "Multiple choice",
  "true-false-not-given": "T/F/NG",
  "yes-no-not-given": "Y/N/NG",
  "fill-in-blank": "Gap fill",
  "short-answer": "Short answer",
  "matching-headings": "Matching headings",
  "matching-information": "Matching information",
  "matching-features": "Matching features",
  "matching-sentence-endings": "Matching endings",
  "summary-completion": "Summary completion",
  "sentence-completion": "Sentence completion",
  "multiple-select": "Multiple select",
  "diagram-label-completion": "Diagram labelling",
}

/** Preferred order for filter buttons. Unknown types sort alphabetically at the end. */
export const READING_QUESTION_TYPE_ORDER = [
  "multiple-choice",
  "true-false-not-given",
  "yes-no-not-given",
  "fill-in-blank",
  "short-answer",
  "matching-headings",
  "matching-information",
  "matching-features",
  "matching-sentence-endings",
  "summary-completion",
  "sentence-completion",
  "multiple-select",
  "diagram-label-completion",
] as const

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
    const ai = READING_QUESTION_TYPE_ORDER.indexOf(a as (typeof READING_QUESTION_TYPE_ORDER)[number])
    const bi = READING_QUESTION_TYPE_ORDER.indexOf(b as (typeof READING_QUESTION_TYPE_ORDER)[number])
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function collectAvailableReadingTypes(
  readings: { questionTypes?: string[] }[],
): string[] {
  const set = new Set<string>()
  for (const reading of readings) {
    for (const type of reading.questionTypes ?? []) {
      set.add(type)
    }
  }
  return sortReadingQuestionTypes([...set])
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
