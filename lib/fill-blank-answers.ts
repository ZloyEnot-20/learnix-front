import type { GrammarQuestion } from "./grammar-types"

export function isBlankCorrect(input: string, accepted: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()
  const got = norm(input)
  return accepted.some((a) => norm(a) === got)
}

/** Resolve accepted answers for one blank, including legacy data shapes. */
export function getAcceptableAnswersForBlank(
  question: Pick<GrammarQuestion, "acceptableAnswers" | "blanks">,
  blankIndex: number,
): string[] {
  const all = question.acceptableAnswers ?? []
  const blanksCount = question.blanks?.length ?? 0
  if (blanksCount === 0 || blankIndex < 0 || blankIndex >= blanksCount) return []

  const nonEmpty = (arr: string[] | undefined) =>
    (arr ?? []).map((s) => s.trim()).filter(Boolean)

  if (blanksCount > 1 && all.length === 1 && all[0].length >= blanksCount) {
    const answer = all[0][blankIndex]?.trim()
    return answer ? [answer] : []
  }

  if (all.length === blanksCount) {
    return nonEmpty(all[blankIndex])
  }

  if (blanksCount === 1 && blankIndex === 0 && all.length > 1) {
    if (all.every((entry) => typeof entry === "string")) {
      return all.map((s) => s.trim()).filter(Boolean)
    }
    return all.flatMap(nonEmpty)
  }

  if (blanksCount === 1 && all.length === 1) {
    return nonEmpty(all[0])
  }

  if (blankIndex < all.length) {
    return nonEmpty(all[blankIndex])
  }

  const blank = question.blanks?.[blankIndex]
  if (blank) {
    const stripped = blank.replace(/^\((.*)\)$/, "$1").trim()
    return stripped ? [stripped] : [blank]
  }

  return []
}

export function formatFillBlankCorrectAnswer(
  question: Pick<GrammarQuestion, "acceptableAnswers" | "blanks">,
): string {
  const blanksCount = question.blanks?.length ?? 0
  if (blanksCount === 0) return ""

  return Array.from({ length: blanksCount }, (_, i) => {
    const accepted = getAcceptableAnswersForBlank(question, i)
    if (accepted.length > 0) return accepted.join(" or ")
    return question.blanks?.[i] ?? ""
  }).join(" / ")
}
