/** Human-readable labels for IELTS Listening question types (filter chips & cards). */
export const LISTENING_QUESTION_TYPE_LABELS: Record<string, string> = {
  "fill-in-blank": "Gap fill",
  "multiple-choice": "Multiple choice",
  matching: "Matching",
  "note-completion": "Notes",
  "table-completion": "Table",
  "flow-chart": "Flow-chart",
  "map-labelling": "Map / diagram",
  "multiple-select": "Multiple select",
}

/** Preferred order for filter buttons. */
export const LISTENING_QUESTION_TYPE_ORDER = [
  "fill-in-blank",
  "note-completion",
  "table-completion",
  "flow-chart",
  "map-labelling",
  "multiple-choice",
  "multiple-select",
  "matching",
] as const

export function listeningQuestionTypeLabel(type: string): string {
  return (
    LISTENING_QUESTION_TYPE_LABELS[type] ??
    type
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  )
}

export function sortListeningQuestionTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ai = LISTENING_QUESTION_TYPE_ORDER.indexOf(
      a as (typeof LISTENING_QUESTION_TYPE_ORDER)[number],
    )
    const bi = LISTENING_QUESTION_TYPE_ORDER.indexOf(
      b as (typeof LISTENING_QUESTION_TYPE_ORDER)[number],
    )
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export function collectAvailableListeningTypes(
  listenings: { questionTypes?: string[] }[],
): string[] {
  const set = new Set<string>()
  for (const test of listenings) {
    for (const type of test.questionTypes ?? []) {
      set.add(type)
    }
  }
  return sortListeningQuestionTypes([...set])
}

export function filterListeningsByQuestionType<T extends { questionTypes?: string[] }>(
  listenings: T[],
  type: string | null,
): T[] {
  if (!type) return listenings
  return listenings.filter((test) => (test.questionTypes ?? []).includes(type))
}

export function countListeningsByQuestionType(
  listenings: { questionTypes?: string[] }[],
  type: string,
): number {
  return listenings.filter((test) => (test.questionTypes ?? []).includes(type)).length
}
